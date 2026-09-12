"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { ROLES } from "@/config/constants";

function getText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalText(value: string): string | null {
  return value ? value : null;
}

export async function createAcademicYearAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();

  const name = getText(formData, "name");
  const start_date = getText(formData, "start_date");
  const end_date = getText(formData, "end_date");

  if (!name || !start_date || !end_date) {
    redirect("/admin/academic-years");
  }

  const { error } = await supabase.from("academic_years").insert({
    name,
    start_date,
    end_date,
    is_current: false,
  });

  if (error) {
    console.error("createAcademicYearAction error:", error);
  }

  revalidatePath("/admin/academic-years");
  redirect("/admin/academic-years");
}

export async function setCurrentAcademicYearAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  const id = getText(formData, "academic_year_id");

  if (!id) {
    redirect("/admin/academic-years");
  }

  const { error: clearError } = await supabase.from("academic_years").update({ is_current: false });
  if (clearError) {
    console.error("setCurrentAcademicYearAction clear error:", clearError);
    redirect("/admin/academic-years");
  }

  const { error } = await supabase.from("academic_years").update({ is_current: true }).eq("id", id);
  if (error) {
    console.error("setCurrentAcademicYearAction select error:", error);
    redirect("/admin/academic-years");
  }

  revalidatePath("/admin/academic-years");
  redirect("/admin/academic-years");
}

export async function updateAcademicYearAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();

  const id = getText(formData, "academic_year_id");
  const name = getText(formData, "name");
  const start_date = getText(formData, "start_date");
  const end_date = getText(formData, "end_date");

  if (!id || !name || !start_date || !end_date) {
    redirect("/admin/academic-years");
  }

  const { error } = await supabase
    .from("academic_years")
    .update({ name, start_date, end_date })
    .eq("id", id);

  if (error) {
    console.error("updateAcademicYearAction error:", error);
    redirect("/admin/academic-years");
  }

  revalidatePath("/admin/academic-years");
  redirect("/admin/academic-years");
}

export async function deleteAcademicYearAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();

  const id = getText(formData, "academic_year_id");
  if (!id) {
    redirect("/admin/academic-years");
  }

  const { data: rowToDelete, error: fetchError } = await supabase
    .from("academic_years")
    .select("id, is_current")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    console.error("deleteAcademicYearAction fetch error:", fetchError);
    redirect("/admin/academic-years");
  }

  const { error: deleteError } = await supabase.from("academic_years").delete().eq("id", id);
  if (deleteError) {
    console.error("deleteAcademicYearAction delete error:", deleteError);
    redirect("/admin/academic-years");
  }

  if (rowToDelete?.is_current) {
    const { data: fallbackYear, error: fallbackError } = await supabase
      .from("academic_years")
      .select("id")
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!fallbackError && fallbackYear?.id) {
      await supabase.from("academic_years").update({ is_current: false });
      await supabase.from("academic_years").update({ is_current: true }).eq("id", fallbackYear.id);
    }
  }

  revalidatePath("/admin/academic-years");
  redirect("/admin/academic-years");
}

export async function createHouseAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  const name = getText(formData, "name");

  if (!name) {
    redirect("/admin/houses");
  }

  const { error } = await supabase.from("houses").insert({ name });

  if (error) {
    console.error("createHouseAction error:", error);
  }

  revalidatePath("/admin/houses");
  redirect("/admin/houses");
}

export async function createProgramAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  const name = getText(formData, "name");
  const code = getText(formData, "code");

  if (!name) {
    redirect("/admin/programs");
  }

  const { error } = await supabase.from("programs").insert({ name, code: code || name.slice(0, 8).toUpperCase() });

  if (error) {
    console.error("createProgramAction error:", error);
  }

  revalidatePath("/admin/programs");
  redirect("/admin/programs");
}

export async function createFeeTypeAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  const name = getText(formData, "name");
  const description = normalizeOptionalText(getText(formData, "description"));

  if (!name) {
    redirect("/admin/fee-types");
  }

  const { error } = await supabase.from("fee_types").insert({
    name,
    description,
    is_active: true,
  });

  if (error) {
    console.error("createFeeTypeAction error:", error);
  }

  revalidatePath("/admin/fee-types");
  redirect("/admin/fee-types");
}

export async function createStaffAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();

  const full_name = getText(formData, "full_name");
  const email = getText(formData, "email");
  const password = getText(formData, "password");
  const phone = normalizeOptionalText(getText(formData, "phone"));
  const role = getText(formData, "role");

  if (!full_name || !email || !password || !ROLES.includes(role as never)) {
    redirect("/admin/staff");
  }

  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name,
        role,
        phone,
        is_active: true,
      },
    },
  });

  if (signUpError || !authData.user) {
    console.error("createStaffAction signUp error:", signUpError);
    redirect("/admin/staff");
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({
      id: authData.user.id,
      full_name,
      role: role as (typeof ROLES)[number],
      phone,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });

  if (profileError) {
    console.error("createStaffAction profile upsert error:", profileError);
  }

  revalidatePath("/admin/staff");
  redirect("/admin/staff");
}
