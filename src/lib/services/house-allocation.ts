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
  studentName: string;
  gender: Gender;
  fromHouseId: string;
  fromHouseName: string;
  toHouseId: string;
  toHouseName: string;
}

export interface RebalancePlan {
  currentDistribution: HouseDistributionItem[];
  proposedDistribution: HouseDistributionItem[];
  moves: RebalanceMove[];
  totalMoves: number;
  isBalanced: boolean;
}

/**
 * Fetch current live distribution of students across all houses.
 */
export async function getHouseDistributionData(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, "public", any>
): Promise<HouseDistributionItem[]> {
  const { data: houses, error: housesError } = await supabase
    .from("houses")
    .select("id, name, code, capacity, is_active")
    .order("name", { ascending: true });

  if (housesError || !houses) {
    throw new Error("Unable to fetch houses for allocation.");
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
 */
export function computeHouseRebalance(
  currentStudents: {
    id: string;
    fullName: string;
    gender: Gender;
    houseId: string;
  }[],
  houses: HouseDistributionItem[]
): RebalancePlan {
  const activeHouses = houses.filter((h) => h.is_active);
  if (activeHouses.length <= 1 || currentStudents.length === 0) {
    return {
      currentDistribution: houses,
      proposedDistribution: houses,
      moves: [],
      totalMoves: 0,
      isBalanced: true,
    };
  }

  const houseMap = new Map(activeHouses.map((h) => [h.id, h]));
  const males = currentStudents.filter((s) => s.gender === "male" && houseMap.has(s.houseId));
  const females = currentStudents.filter((s) => s.gender === "female" && houseMap.has(s.houseId));

  const numHouses = activeHouses.length;
  const targetMaleBase = Math.floor(males.length / numHouses);
  const targetFemaleBase = Math.floor(females.length / numHouses);

  const maleRemainder = males.length % numHouses;
  const femaleRemainder = females.length % numHouses;

  // Compute targets per house
  const targetDistribution = activeHouses.map((h, index) => ({
    houseId: h.id,
    houseName: h.name,
    targetMale: targetMaleBase + (index < maleRemainder ? 1 : 0),
    targetFemale: targetFemaleBase + (index < femaleRemainder ? 1 : 0),
  }));

  const moves: RebalanceMove[] = [];

  function balanceGender(
    genderList: typeof currentStudents,
    gender: Gender,
    getTarget: (hId: string) => number
  ) {
    const grouped = new Map<string, typeof currentStudents>();
    for (const h of activeHouses) {
      grouped.set(h.id, []);
    }
    for (const s of genderList) {
      grouped.get(s.houseId)?.push(s);
    }

    // Identify surplus and deficit houses
    const surplus: { houseId: string; count: number }[] = [];
    const deficit: { houseId: string; needed: number }[] = [];

    for (const h of activeHouses) {
      const current = grouped.get(h.id)?.length ?? 0;
      const target = getTarget(h.id);
      if (current > target) {
        surplus.push({ houseId: h.id, count: current - target });
      } else if (current < target) {
        deficit.push({ houseId: h.id, needed: target - current });
      }
    }

    let deficitIdx = 0;
    for (const s of surplus) {
      const studentsInHouse = grouped.get(s.houseId) ?? [];
      let movedFromThisHouse = 0;

      while (movedFromThisHouse < s.count && deficitIdx < deficit.length) {
        const targetDeficit = deficit[deficitIdx];
        const studentToMove = studentsInHouse[movedFromThisHouse];

        moves.push({
          studentId: studentToMove.id,
          studentName: studentToMove.fullName,
          gender,
          fromHouseId: s.houseId,
          fromHouseName: houseMap.get(s.houseId)?.name ?? "Unknown",
          toHouseId: targetDeficit.houseId,
          toHouseName: houseMap.get(targetDeficit.houseId)?.name ?? "Unknown",
        });

        movedFromThisHouse++;
        targetDeficit.needed--;
        if (targetDeficit.needed === 0) {
          deficitIdx++;
        }
      }
    }
  }

  const targetMaleMap = new Map(targetDistribution.map((t) => [t.houseId, t.targetMale]));
  const targetFemaleMap = new Map(targetDistribution.map((t) => [t.houseId, t.targetFemale]));

  balanceGender(males, "male", (id) => targetMaleMap.get(id) ?? targetMaleBase);
  balanceGender(females, "female", (id) => targetFemaleMap.get(id) ?? targetFemaleBase);

  // Calculate proposed distribution after moves
  const proposed = houses.map((h) => {
    let male = h.maleCount;
    let female = h.femaleCount;

    for (const m of moves) {
      if (m.fromHouseId === h.id) {
        if (m.gender === "male") male--;
        else female--;
      }
      if (m.toHouseId === h.id) {
        if (m.gender === "male") male++;
        else female++;
      }
    }

    const total = male + female;
    return {
      ...h,
      maleCount: male,
      femaleCount: female,
      totalCount: total,
      occupancyPercent: h.capacity > 0 ? Math.round((total / h.capacity) * 100) : 0,
    };
  });

  return {
    currentDistribution: houses,
    proposedDistribution: proposed,
    moves,
    totalMoves: moves.length,
    isBalanced: moves.length === 0,
  };
}
