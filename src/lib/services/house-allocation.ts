import type { SupabaseClient } from "@supabase/supabase-js";
import type { Gender } from "@/config/constants";

export interface HouseDistributionItem {
  id: string;
  name: string;
  code: string;
  capacity: number;
  is_active: boolean;
  maleCount: number;
  femaleCount: number;
  totalCount: number;
  occupancyPercent: number;
}

export interface HouseAllocationResult {
  assignedHouseId: string;
  assignedHouseName: string;
  distributionAfter: HouseDistributionItem[];
}

export interface RebalanceMove {
  studentId: string;
  jhsIndexNumber?: string;
  studentName: string;
  gender: Gender;
  fromHouseId: string | null;
  fromHouseName: string;
  toHouseId: string;
  toHouseName: string;
  isNewAssignment?: boolean;
}

export interface StayingStudent {
  studentId: string;
  jhsIndexNumber?: string;
  studentName: string;
  gender: Gender;
  houseId: string;
  houseName: string;
}

export interface StudentRebalanceCandidate {
  id: string;
  jhsIndexNumber?: string;
  fullName: string;
  gender: Gender;
  houseId: string | null;
}

export interface RebalancePlan {
  currentDistribution: HouseDistributionItem[];
  proposedDistribution: HouseDistributionItem[];
  moves: RebalanceMove[];
  stayingStudents: StayingStudent[];
  totalEvaluated: number;
  totalMoves: number;
  totalNewAssignments: number;
  totalReassignments: number;
  isBalanced: boolean;
}

/**
 * Fetch current live distribution of students across all houses.
 */
export async function getHouseDistributionData(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, "public", any>
): Promise<HouseDistributionItem[]> {
  let houses: { id: string; name: string; code?: string | null; capacity?: number | null; is_active?: boolean | null }[] | null = null;
  const { data: fullHouses, error: fullError } = await supabase
    .from("houses")
    .select("*")
    .order("name", { ascending: true });

  if (fullError || !fullHouses) {
    const { data: basicHouses, error: basicError } = await supabase
      .from("houses")
      .select("id, name, is_active")
      .order("name", { ascending: true });

    if (basicError || !basicHouses) {
      throw new Error("Unable to fetch houses for allocation: " + (fullError?.message || basicError?.message));
    }
    houses = basicHouses;
  } else {
    houses = fullHouses;
  }

  // Count active students by house and gender
  const { data: studentRows, error: studentsError } = await supabase
    .from("students")
    .select("house_id, gender")
    .eq("enrollment_status", "active")
    .not("house_id", "is", null);

  if (studentsError) {
    console.error("getHouseDistributionData student query error:", studentsError);
  }

  const countsByHouse = new Map<string, { male: number; female: number }>();
  for (const h of houses) {
    countsByHouse.set(h.id, { male: 0, female: 0 });
  }

  if (studentRows) {
    for (const s of studentRows) {
      if (!s.house_id) continue;
      const c = countsByHouse.get(s.house_id);
      if (c) {
        if (s.gender === "male") c.male++;
        else if (s.gender === "female") c.female++;
      }
    }
  }

  return houses.map((h) => {
    const counts = countsByHouse.get(h.id) ?? { male: 0, female: 0 };
    const capacity = h.capacity ?? 150;
    const total = counts.male + counts.female;
    const occupancyPercent = capacity > 0 ? Math.round((total / capacity) * 100) : 0;

    return {
      id: h.id,
      name: h.name,
      code: h.code || h.name.slice(0, 3).toUpperCase(),
      capacity,
      is_active: h.is_active ?? true,
      maleCount: counts.male,
      femaleCount: counts.female,
      totalCount: total,
      occupancyPercent,
    };
  });
}

/**
 * Deterministic gender-balanced allocation for a single student.
 * Minimizes male/female imbalance across active houses while strictly enforcing capacity.
 */
export function assignBalancedHouse(
  gender: Gender,
  houses: HouseDistributionItem[]
): HouseAllocationResult {
  const activeHouses = houses.filter((h) => h.is_active);

  if (activeHouses.length === 0) {
    throw new Error("No active houses are configured in the school system.");
  }

  // Check capacity constraint
  const eligible = activeHouses.filter((h) => h.totalCount < h.capacity);
  if (eligible.length === 0) {
    throw new Error(
      `All active houses are currently at maximum capacity. Cannot allocate student. Please increase house capacities in Admin Settings.`
    );
  }

  // Sort candidate houses:
  // 1. Lowest count of this student's gender (balances gender distribution across houses)
  // 2. Lowest total count (balances overall house population)
  // 3. Name alphabetical (deterministic tie-breaker)
  eligible.sort((a, b) => {
    const genderCountA = gender === "male" ? a.maleCount : a.femaleCount;
    const genderCountB = gender === "male" ? b.maleCount : b.femaleCount;

    if (genderCountA !== genderCountB) {
      return genderCountA - genderCountB;
    }
    if (a.totalCount !== b.totalCount) {
      return a.totalCount - b.totalCount;
    }
    return a.name.localeCompare(b.name);
  });

  const selected = eligible[0];

  // Compute distribution after this assignment
  const distributionAfter = houses.map((h) => {
    if (h.id === selected.id) {
      const male = gender === "male" ? h.maleCount + 1 : h.maleCount;
      const female = gender === "female" ? h.femaleCount + 1 : h.femaleCount;
      const total = male + female;
      return {
        ...h,
        maleCount: male,
        femaleCount: female,
        totalCount: total,
        occupancyPercent: h.capacity > 0 ? Math.round((total / h.capacity) * 100) : 0,
      };
    }
    return h;
  });

  return {
    assignedHouseId: selected.id,
    assignedHouseName: selected.name,
    distributionAfter,
  };
}

/**
 * Batch balanced house allocation for bulk import or multiple enrollments.
 */
export function batchAssignBalancedHouses<T extends { gender: Gender; house_id?: string | null }>(
  items: T[],
  currentHouses: HouseDistributionItem[]
): {
  assignedItems: (T & { house_id: string; house_name: string })[];
  distributionAfter: HouseDistributionItem[];
} {
  const simulatedHouses = currentHouses.map((h) => ({ ...h }));
  const assignedItems: (T & { house_id: string; house_name: string })[] = [];

  for (const item of items) {
    const result = assignBalancedHouse(item.gender, simulatedHouses);
    const houseIndex = simulatedHouses.findIndex((h) => h.id === result.assignedHouseId);
    if (houseIndex >= 0) {
      if (item.gender === "male") simulatedHouses[houseIndex].maleCount++;
      else simulatedHouses[houseIndex].femaleCount++;
      simulatedHouses[houseIndex].totalCount++;
      simulatedHouses[houseIndex].occupancyPercent =
        simulatedHouses[houseIndex].capacity > 0
          ? Math.round((simulatedHouses[houseIndex].totalCount / simulatedHouses[houseIndex].capacity) * 100)
          : 0;
    }

    assignedItems.push({
      ...item,
      house_id: result.assignedHouseId,
      house_name: result.assignedHouseName,
    });
  }

  return {
    assignedItems,
    distributionAfter: simulatedHouses,
  };
}

/**
 * Compute optimal rebalance moves to minimize gender and total skew across active houses.
 * Unassigned students are prioritized to fill house deficits so that existing
 * valid house assignments are preserved whenever possible.
 */
export function computeHouseRebalance(
  currentStudents: StudentRebalanceCandidate[],
  houses: HouseDistributionItem[]
): RebalancePlan {
  const activeHouses = houses.filter((h) => h.is_active);
  if (activeHouses.length === 0 || currentStudents.length === 0) {
    return {
      currentDistribution: houses,
      proposedDistribution: houses,
      moves: [],
      stayingStudents: [],
      totalEvaluated: currentStudents.length,
      totalMoves: 0,
      totalNewAssignments: 0,
      totalReassignments: 0,
      isBalanced: true,
    };
  }

  const houseMap = new Map(activeHouses.map((h) => [h.id, h]));
  const numHouses = activeHouses.length;

  const males = currentStudents.filter((s) => s.gender === "male");
  const females = currentStudents.filter((s) => s.gender === "female");

  const targetMaleBase = Math.floor(males.length / numHouses);
  const maleRemainder = males.length % numHouses;

  const currentHouseCounts = new Map<
    string,
    { maleStudents: StudentRebalanceCandidate[]; femaleStudents: StudentRebalanceCandidate[] }
  >();
  for (const h of activeHouses) {
    currentHouseCounts.set(h.id, { maleStudents: [], femaleStudents: [] });
  }

  const unassignedMales: StudentRebalanceCandidate[] = [];
  const unassignedFemales: StudentRebalanceCandidate[] = [];

  for (const s of currentStudents) {
    if (s.houseId && houseMap.has(s.houseId)) {
      const entry = currentHouseCounts.get(s.houseId)!;
      if (s.gender === "male") entry.maleStudents.push(s);
      else entry.femaleStudents.push(s);
    } else {
      if (s.gender === "male") unassignedMales.push(s);
      else unassignedFemales.push(s);
    }
  }

  // Sort houses by current male count descending to award remainder males to houses that already have them
  const housesSortedByMaleAffinity = [...activeHouses].sort((a, b) => {
    const aMales = currentHouseCounts.get(a.id)?.maleStudents.length ?? 0;
    const bMales = currentHouseCounts.get(b.id)?.maleStudents.length ?? 0;
    if (aMales !== bMales) return bMales - aMales;
    return a.name.localeCompare(b.name);
  });

  const housesWithExtraMale = new Set(
    housesSortedByMaleAffinity.slice(0, maleRemainder).map((h) => h.id)
  );

  const targetFemaleBase = Math.floor(females.length / numHouses);
  const femaleRemainder = females.length % numHouses;

  // For females: prioritize houses that did NOT receive an extra male to keep total counts equal
  const nonExtraMaleHouses = activeHouses.filter((h) => !housesWithExtraMale.has(h.id));
  const extraMaleHouses = activeHouses.filter((h) => housesWithExtraMale.has(h.id));

  nonExtraMaleHouses.sort((a, b) => {
    const aFem = currentHouseCounts.get(a.id)?.femaleStudents.length ?? 0;
    const bFem = currentHouseCounts.get(b.id)?.femaleStudents.length ?? 0;
    if (aFem !== bFem) return bFem - aFem;
    return a.name.localeCompare(b.name);
  });
  extraMaleHouses.sort((a, b) => {
    const aFem = currentHouseCounts.get(a.id)?.femaleStudents.length ?? 0;
    const bFem = currentHouseCounts.get(b.id)?.femaleStudents.length ?? 0;
    if (aFem !== bFem) return bFem - aFem;
    return a.name.localeCompare(b.name);
  });

  const combinedFemaleCandidates = [...nonExtraMaleHouses, ...extraMaleHouses];
  const housesWithExtraFemale = new Set(
    combinedFemaleCandidates.slice(0, femaleRemainder).map((h) => h.id)
  );

  const targetMap = new Map<string, { targetMale: number; targetFemale: number; targetTotal: number }>();
  for (const h of activeHouses) {
    const targetMale = targetMaleBase + (housesWithExtraMale.has(h.id) ? 1 : 0);
    const targetFemale = targetFemaleBase + (housesWithExtraFemale.has(h.id) ? 1 : 0);
    targetMap.set(h.id, {
      targetMale,
      targetFemale,
      targetTotal: targetMale + targetFemale,
    });
  }

  const moves: RebalanceMove[] = [];
  const stayingStudents: StayingStudent[] = [];

  function balanceGender(
    unassignedList: StudentRebalanceCandidate[],
    getHouseStudents: (hId: string) => StudentRebalanceCandidate[],
    getTarget: (hId: string) => number,
    gender: Gender
  ) {
    const deficitHouses: { houseId: string; needed: number }[] = [];
    const surplusHouses: { houseId: string; surplusList: StudentRebalanceCandidate[] }[] = [];

    for (const h of activeHouses) {
      const currentList = getHouseStudents(h.id);
      const target = getTarget(h.id);
      if (currentList.length < target) {
        deficitHouses.push({ houseId: h.id, needed: target - currentList.length });
        for (const s of currentList) {
          stayingStudents.push({
            studentId: s.id,
            jhsIndexNumber: s.jhsIndexNumber,
            studentName: s.fullName,
            gender: s.gender,
            houseId: h.id,
            houseName: h.name,
          });
        }
      } else if (currentList.length > target) {
        const stayingCount = target;
        for (let i = 0; i < stayingCount; i++) {
          const s = currentList[i];
          stayingStudents.push({
            studentId: s.id,
            jhsIndexNumber: s.jhsIndexNumber,
            studentName: s.fullName,
            gender: s.gender,
            houseId: h.id,
            houseName: h.name,
          });
        }
        surplusHouses.push({
          houseId: h.id,
          surplusList: currentList.slice(stayingCount),
        });
      } else {
        for (const s of currentList) {
          stayingStudents.push({
            studentId: s.id,
            jhsIndexNumber: s.jhsIndexNumber,
            studentName: s.fullName,
            gender: s.gender,
            houseId: h.id,
            houseName: h.name,
          });
        }
      }
    }

    // Step A: Fill deficits with unassigned students
    let unassignedIdx = 0;
    for (const d of deficitHouses) {
      while (d.needed > 0 && unassignedIdx < unassignedList.length) {
        const student = unassignedList[unassignedIdx++];
        moves.push({
          studentId: student.id,
          jhsIndexNumber: student.jhsIndexNumber,
          studentName: student.fullName,
          gender,
          fromHouseId: null,
          fromHouseName: "Unassigned",
          toHouseId: d.houseId,
          toHouseName: houseMap.get(d.houseId)?.name ?? "Unknown",
          isNewAssignment: true,
        });
        d.needed--;
      }
    }

    // Step B: If deficits still remain and surplus exists, transfer surplus students
    let deficitIdx = 0;
    for (const s of surplusHouses) {
      for (const student of s.surplusList) {
        while (deficitIdx < deficitHouses.length && deficitHouses[deficitIdx].needed === 0) {
          deficitIdx++;
        }
        if (deficitIdx < deficitHouses.length) {
          const targetD = deficitHouses[deficitIdx];
          moves.push({
            studentId: student.id,
            jhsIndexNumber: student.jhsIndexNumber,
            studentName: student.fullName,
            gender,
            fromHouseId: s.houseId,
            fromHouseName: houseMap.get(s.houseId)?.name ?? "Unknown",
            toHouseId: targetD.houseId,
            toHouseName: houseMap.get(targetD.houseId)?.name ?? "Unknown",
            isNewAssignment: false,
          });
          targetD.needed--;
        }
      }
    }
  }

  balanceGender(
    unassignedMales,
    (hId) => currentHouseCounts.get(hId)?.maleStudents ?? [],
    (hId) => targetMap.get(hId)?.targetMale ?? targetMaleBase,
    "male"
  );

  balanceGender(
    unassignedFemales,
    (hId) => currentHouseCounts.get(hId)?.femaleStudents ?? [],
    (hId) => targetMap.get(hId)?.targetFemale ?? targetFemaleBase,
    "female"
  );

  const proposedDistribution: HouseDistributionItem[] = activeHouses.map((h) => {
    const targets = targetMap.get(h.id)!;
    const capacity = h.capacity ?? 150;
    const total = targets.targetTotal;
    const occupancyPercent = capacity > 0 ? Math.round((total / capacity) * 100) : 0;
    return {
      id: h.id,
      name: h.name,
      code: h.code || h.name.slice(0, 3).toUpperCase(),
      capacity,
      is_active: h.is_active,
      maleCount: targets.targetMale,
      femaleCount: targets.targetFemale,
      totalCount: total,
      occupancyPercent,
    };
  });

  const totalNewAssignments = moves.filter((m) => m.isNewAssignment).length;
  const totalReassignments = moves.filter((m) => !m.isNewAssignment).length;

  return {
    currentDistribution: houses,
    proposedDistribution,
    moves,
    stayingStudents,
    totalEvaluated: currentStudents.length,
    totalMoves: moves.length,
    totalNewAssignments,
    totalReassignments,
    isBalanced: moves.length === 0,
  };
}
