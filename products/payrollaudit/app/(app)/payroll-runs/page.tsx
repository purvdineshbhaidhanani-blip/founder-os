"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { DataTable, type DataTableColumn } from "@founder-os/ui/dashboard";
import { EmptyState, ErrorState, Skeleton, Modal, Button, Input, Select, Badge, useToast } from "@founder-os/ui/primitives";

interface CompanyOption {
  id: string;
  name: string;
}

interface EmployeeOption {
  id: string;
  employeeCode: string;
  fullName: string;
  companyId: string;
}

interface PayrollRunRow {
  id: string;
  periodStart: string;
  periodEnd: string;
  complianceScore: number;
  company: { name: string };
}

interface LineDraft {
  employeeId: string;
  regularHours: string;
  overtimeHours: string;
  grossPay: string;
  taxWithheld: string;
  netPay: string;
  attendanceHours: string;
}

const EMPTY_LINE: LineDraft = { employeeId: "", regularHours: "80", overtimeHours: "0", grossPay: "", taxWithheld: "", netPay: "", attendanceHours: "" };

function scoreVariant(score: number): "success" | "warning" | "destructive" {
  if (score >= 90) return "success";
  if (score >= 60) return "warning";
  return "destructive";
}

export default function PayrollRunsPage() {
  const { show } = useToast();
  const [runs, setRuns] = useState<PayrollRunRow[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companyId, setCompanyId] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([{ ...EMPTY_LINE }]);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const [runsResponse, companiesResponse, employeesResponse] = await Promise.all([
        fetch("/api/payroll-runs"),
        fetch("/api/companies"),
        fetch("/api/employees"),
      ]);
      const runsBody = await runsResponse.json();
      const companiesBody = await companiesResponse.json();
      const employeesBody = await employeesResponse.json();
      if (!runsResponse.ok) throw new Error(runsBody.error?.message);
      if (!companiesResponse.ok) throw new Error(companiesBody.error?.message);
      if (!employeesResponse.ok) throw new Error(employeesBody.error?.message);
      setRuns(runsBody.data.data);
      setCompanies(companiesBody.data.data);
      setEmployees(employeesBody.data.data);
      if (companiesBody.data.data.length > 0) setCompanyId((current) => current || companiesBody.data.data[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payroll runs.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function updateLine(index: number, field: keyof LineDraft, value: string) {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, [field]: value } : line)));
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/payroll-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          periodStart: formData.get("periodStart"),
          periodEnd: formData.get("periodEnd"),
          payslipLines: lines
            .filter((l) => l.employeeId)
            .map((l) => ({
              employeeId: l.employeeId,
              regularHours: Number(l.regularHours),
              overtimeHours: Number(l.overtimeHours || 0),
              grossPayCents: Math.round(Number(l.grossPay) * 100),
              taxWithheldCents: Math.round(Number(l.taxWithheld) * 100),
              netPayCents: Math.round(Number(l.netPay) * 100),
              ...(l.attendanceHours ? { attendanceHoursReported: Number(l.attendanceHours) } : {}),
            })),
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        show({ title: "Couldn't validate payroll run", description: body.error?.message, variant: "destructive" });
        return;
      }
      show({ title: "Payroll run validated", variant: "success" });
      setIsModalOpen(false);
      setLines([{ ...EMPTY_LINE }]);
      load();
    } finally {
      setIsSubmitting(false);
    }
  }

  const employeesForCompany = employees.filter((e) => e.companyId === companyId);

  const columns: DataTableColumn<PayrollRunRow>[] = [
    { key: "company", header: "Company", render: (row) => row.company.name },
    { key: "period", header: "Period", render: (row) => `${new Date(row.periodStart).toLocaleDateString()} – ${new Date(row.periodEnd).toLocaleDateString()}` },
    { key: "score", header: "Compliance score", sortable: true, render: (row) => <Badge variant={scoreVariant(row.complianceScore)}>{row.complianceScore}</Badge> },
    { key: "view", header: "", render: (row) => <Link href={`/payroll-runs/${row.id}`}>View →</Link> },
  ];

  return (
    <div>
      <div className="pa-page-header">
        <div>
          <h1 className="pa-page-title">Payroll runs</h1>
          <p className="pa-page-description">Import a run to validate every payslip line before disbursement.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} disabled={companies.length === 0 || employees.length === 0}>
          New payroll run
        </Button>
      </div>

      {isLoading ? (
        <Skeleton style={{ height: 200 }} />
      ) : error ? (
        <ErrorState description={error} onRetry={load} />
      ) : runs.length === 0 ? (
        <EmptyState title="No payroll runs yet" description="Add employees, then import your first payroll run to validate it." />
      ) : (
        <DataTable columns={columns} rows={runs} getRowId={(row) => row.id} />
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New payroll run" description="Enter each payslip line as reported by your payroll software export.">
        <form className="pa-auth-form" onSubmit={handleCreate}>
          <Select name="companyId" label="Company" value={companyId} onChange={(e) => setCompanyId(e.target.value)} options={companies.map((c) => ({ value: c.id, label: c.name }))} required />
          <div className="pa-form-grid">
            <Input name="periodStart" type="date" label="Period start" required />
            <Input name="periodEnd" type="date" label="Period end" required />
          </div>

          {lines.map((line, index) => (
            <div key={index} className="pa-copilot-action">
              <div className="pa-copilot-action-header">
                <strong>Payslip line {index + 1}</strong>
                {lines.length > 1 && (
                  <Button type="button" variant="outline" onClick={() => setLines((current) => current.filter((_, i) => i !== index))}>
                    Remove
                  </Button>
                )}
              </div>
              <div className="pa-form-grid">
                <Select
                  label="Employee"
                  value={line.employeeId}
                  onChange={(e) => updateLine(index, "employeeId", e.target.value)}
                  options={employeesForCompany.map((e) => ({ value: e.id, label: `${e.fullName} (${e.employeeCode})` }))}
                  placeholder="Select an employee"
                  required
                />
                <Input type="number" step="0.5" min="0" label="Regular hours" value={line.regularHours} onChange={(e) => updateLine(index, "regularHours", e.target.value)} required />
                <Input type="number" step="0.5" min="0" label="Overtime hours" value={line.overtimeHours} onChange={(e) => updateLine(index, "overtimeHours", e.target.value)} />
                <Input type="number" step="0.01" min="0" label="Gross pay ($)" value={line.grossPay} onChange={(e) => updateLine(index, "grossPay", e.target.value)} required />
                <Input type="number" step="0.01" min="0" label="Tax withheld ($)" value={line.taxWithheld} onChange={(e) => updateLine(index, "taxWithheld", e.target.value)} required />
                <Input type="number" step="0.01" min="0" label="Net pay ($)" value={line.netPay} onChange={(e) => updateLine(index, "netPay", e.target.value)} required />
                <Input type="number" step="0.5" min="0" label="Attendance hours (optional)" value={line.attendanceHours} onChange={(e) => updateLine(index, "attendanceHours", e.target.value)} />
              </div>
            </div>
          ))}

          <Button type="button" variant="outline" onClick={() => setLines((current) => [...current, { ...EMPTY_LINE }])}>
            Add another payslip line
          </Button>

          <div className="pa-form-actions">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Validate payroll run
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
