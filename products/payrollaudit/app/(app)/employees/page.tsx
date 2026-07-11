"use client";

import { useEffect, useState, type FormEvent } from "react";
import { DataTable, type DataTableColumn } from "@founder-os/ui/dashboard";
import { EmptyState, ErrorState, Skeleton, Modal, Button, Input, Select, Badge, useToast } from "@founder-os/ui/primitives";

interface CompanyOption {
  id: string;
  name: string;
}

interface EmployeeRow {
  id: string;
  employeeCode: string;
  fullName: string;
  payType: string;
  hourlyRateCents: number | null;
  annualSalaryCents: number | null;
  active: boolean;
  company: { name: string };
}

function formatCents(cents: number | null): string {
  if (cents === null) return "—";
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

export default function EmployeesPage() {
  const { show } = useToast();
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [payType, setPayType] = useState("hourly");

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const [employeesResponse, companiesResponse] = await Promise.all([fetch("/api/employees"), fetch("/api/companies")]);
      const employeesBody = await employeesResponse.json();
      const companiesBody = await companiesResponse.json();
      if (!employeesResponse.ok) throw new Error(employeesBody.error?.message);
      if (!companiesResponse.ok) throw new Error(companiesBody.error?.message);
      setEmployees(employeesBody.data.data);
      setCompanies(companiesBody.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load employees.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const dollarsField = payType === "hourly" ? "hourlyRate" : "annualSalary";
    const dollars = Number(formData.get(dollarsField));

    try {
      const response = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: formData.get("companyId"),
          employeeCode: formData.get("employeeCode"),
          fullName: formData.get("fullName"),
          payType,
          payPeriodsPerYear: Number(formData.get("payPeriodsPerYear")),
          ...(payType === "hourly" ? { hourlyRateCents: Math.round(dollars * 100) } : { annualSalaryCents: Math.round(dollars * 100) }),
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        show({ title: "Couldn't create employee", description: body.error?.message, variant: "destructive" });
        return;
      }
      show({ title: "Employee created", variant: "success" });
      setIsModalOpen(false);
      load();
    } finally {
      setIsSubmitting(false);
    }
  }

  const columns: DataTableColumn<EmployeeRow>[] = [
    { key: "employeeCode", header: "Code", sortable: true, render: (row) => row.employeeCode },
    { key: "fullName", header: "Name", sortable: true, render: (row) => row.fullName },
    { key: "company", header: "Company", render: (row) => row.company.name },
    { key: "payType", header: "Pay type", render: (row) => <Badge variant="info">{row.payType}</Badge> },
    { key: "rate", header: "Rate / Salary", render: (row) => (row.payType === "hourly" ? `${formatCents(row.hourlyRateCents)}/hr` : `${formatCents(row.annualSalaryCents)}/yr`) },
    { key: "active", header: "Status", render: (row) => <Badge variant={row.active ? "success" : "default"}>{row.active ? "Active" : "Inactive"}</Badge> },
  ];

  return (
    <div>
      <div className="pa-page-header">
        <div>
          <h1 className="pa-page-title">Employees</h1>
          <p className="pa-page-description">Your payroll headcount, across all companies.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} disabled={companies.length === 0}>
          New employee
        </Button>
      </div>

      {isLoading ? (
        <Skeleton style={{ height: 200 }} />
      ) : error ? (
        <ErrorState description={error} onRetry={load} />
      ) : employees.length === 0 ? (
        <EmptyState title="No employees yet" description="Add an employee before importing a payroll run for validation." />
      ) : (
        <DataTable columns={columns} rows={employees} getRowId={(row) => row.id} />
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New employee" description="Employees are validated against every payroll run they appear in.">
        <form className="pa-auth-form" onSubmit={handleCreate}>
          <Select name="companyId" label="Company" options={companies.map((c) => ({ value: c.id, label: c.name }))} required />
          <div className="pa-form-grid">
            <Input name="employeeCode" label="Employee code" required placeholder="E-1042" />
            <Input name="fullName" label="Full name" required placeholder="Priya Nair" />
          </div>
          <Select
            name="payType"
            label="Pay type"
            value={payType}
            onChange={(e) => setPayType(e.target.value)}
            options={[
              { value: "hourly", label: "Hourly" },
              { value: "salaried", label: "Salaried" },
            ]}
            required
          />
          <div className="pa-form-grid">
            {payType === "hourly" ? (
              <Input name="hourlyRate" type="number" step="0.01" min="0" label="Hourly rate ($)" required placeholder="25.00" />
            ) : (
              <Input name="annualSalary" type="number" step="0.01" min="0" label="Annual salary ($)" required placeholder="78000" />
            )}
            <Select
              name="payPeriodsPerYear"
              label="Pay periods / year"
              defaultValue="26"
              options={[
                { value: "12", label: "Monthly (12)" },
                { value: "24", label: "Semi-monthly (24)" },
                { value: "26", label: "Biweekly (26)" },
                { value: "52", label: "Weekly (52)" },
              ]}
              required
            />
          </div>
          <div className="pa-form-actions">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Create employee
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
