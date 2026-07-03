import React, { useMemo } from "react";
import { X, Heart, ShieldAlert, CheckCircle, Activity, BarChart2 } from "lucide-react";

export default function PatientComparison({
  comparisonList,
  data,
  role,
  onClose,
  onRemovePatient
}) {
  const patients = useMemo(() => {
    return data.filter((r) => comparisonList.includes(r.patient_id));
  }, [data, comparisonList]);

  // Mask PII if analyst
  const maskText = (text, type) => {
    if (role !== "analyst") return text;
    if (type === "name") {
      const [first, ...rest] = text.split(" ");
      const last = rest.join(" ");
      return `${first.charAt(0)}*** ${last.charAt(0)}***`;
    }
    if (type === "id") {
      return text.substring(0, 4) + "***";
    }
    return text;
  };

  return (
    <div className={`comparison-drawer ${comparisonList.length > 0 ? "open" : ""}`}>
      <div className="comparison-drawer-header">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <BarChart2 size={20} style={{ color: "var(--color-primary)" }} />
          <h3>Patient Comparative Side-by-Side Analysis</h3>
          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginLeft: "8px" }}>
            Comparing {patients.length} select files
          </span>
        </div>
        <button
          className="profile-close-btn"
          onClick={onClose}
          style={{ padding: "4px" }}
        >
          <X size={20} />
        </button>
      </div>

      <div className="comparison-cards-row">
        {patients.map((patient) => {
          // Check vital stability
          const sys = parseInt(patient.systolic_bp) || 120;
          const hr = parseInt(patient.heart_rate) || 75;
          const spo2 = parseInt(patient.oxygen_saturation) || 98;
          const temp = parseFloat(patient.temperature_f) || 98.6;
          const isCritical = spo2 < 92 || sys > 175 || sys < 90 || hr > 120 || hr < 50 || temp > 101.5 || temp < 95.5;

          return (
            <div key={patient.patient_id} className="comparison-patient-card">
              <div className="flex-row-between" style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "8px" }}>
                <div>
                  <h4 style={{ fontSize: "0.92rem", fontWeight: "700" }}>
                    {maskText(`${patient.first_name} ${patient.last_name}`, "name")}
                  </h4>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    MRN: {maskText(patient.patient_id, "id")}
                  </span>
                </div>
                <button
                  className="profile-close-btn"
                  onClick={() => onRemovePatient(patient.patient_id)}
                  style={{ padding: "2px" }}
                >
                  <X size={14} />
                </button>
              </div>

              {/* Stats Matrix */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.78rem" }}>
                <div className="flex-row-between">
                  <span style={{ color: "var(--text-muted)" }}>Age/Gender:</span>
                  <strong>{patient.age} yrs / {patient.gender}</strong>
                </div>
                <div className="flex-row-between">
                  <span style={{ color: "var(--text-muted)" }}>Department:</span>
                  <strong>{patient.department}</strong>
                </div>
                <div className="flex-row-between">
                  <span style={{ color: "var(--text-muted)" }}>Diagnosis:</span>
                  <strong>{patient.primary_diagnosis}</strong>
                </div>
                <div className="flex-row-between">
                  <span style={{ color: "var(--text-muted)" }}>NEWS2 Warning Tier:</span>
                  <span className={`risk-badge ${patient.deterioration_risk.toLowerCase()}`} style={{ padding: "2px 6px", fontSize: "0.68rem" }}>
                    {patient.deterioration_risk} ({patient.news2_score})
                  </span>
                </div>
                <div className="flex-row-between">
                  <span style={{ color: "var(--text-muted)" }}>Readmit Probability:</span>
                  <span className={`risk-badge ${patient.readmission_risk_tier.toLowerCase()}`} style={{ padding: "2px 6px", fontSize: "0.68rem" }}>
                    {patient.readmission_probability}% ({patient.readmission_risk_tier})
                  </span>
                </div>
                <div className="flex-row-between">
                  <span style={{ color: "var(--text-muted)" }}>Med Compliance:</span>
                  <strong>{patient.med_adherence_pct}%</strong>
                </div>
              </div>

              {/* Vitals side-by-side indicator bar */}
              <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "8px", marginTop: "4px" }}>
                <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                  Active Vitals Snapshot:
                </span>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "4px", textAlign: "center", fontSize: "0.72rem" }}>
                  <div style={{ padding: "4px", backgroundColor: "var(--bg-secondary)", borderRadius: "2px" }}>
                    <span style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>BP</span>
                    <p style={{ fontWeight: "700" }}>{patient.systolic_bp}/{patient.diastolic_bp}</p>
                  </div>
                  <div style={{ padding: "4px", backgroundColor: "var(--bg-secondary)", borderRadius: "2px" }}>
                    <span style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>SpO2</span>
                    <p style={{ fontWeight: "700", color: patient.oxygen_saturation < 92 ? "var(--color-danger)" : "var(--text-main)" }}>
                      {patient.oxygen_saturation}%
                    </p>
                  </div>
                  <div style={{ padding: "4px", backgroundColor: "var(--bg-secondary)", borderRadius: "2px" }}>
                    <span style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>HR</span>
                    <p style={{ fontWeight: "700" }}>{patient.heart_rate}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {patients.length < 3 && (
          <div style={{
            width: "280px",
            border: "1px dashed var(--border-color)",
            borderRadius: "var(--radius-md)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "16px",
            color: "var(--text-muted)",
            fontSize: "0.82rem",
            flexShrink: 0
          }}>
            <p>Select another patient from the registry table using the <strong>Compare</strong> button.</p>
          </div>
        )}
      </div>
    </div>
  );
}
