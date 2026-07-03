import React, { useState, useMemo } from "react";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from "chart.js";
import {
  Search,
  Users,
  Bed,
  AlertTriangle,
  Heart,
  TrendingUp,
  Download,
  Filter,
  Eye,
  Plus,
  Minus,
  CheckCircle,
  FileText
} from "lucide-react";

// Register Chart.js elements
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Dashboard({
  data,
  role,
  vitalsThresholds = {},
  onOpenProfile,
  onAddToCompare,
  onRemoveFromCompare,
  comparisonList,
  onOpenComparison
}) {
  // Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");
  const [selectedRisk, setSelectedRisk] = useState("All");
  const [patientStatus, setPatientStatus] = useState("All"); // 'All', 'Inpatient', 'Discharged'

  // Extract unique departments dynamically
  const departmentsList = useMemo(() => {
    const depts = new Set(data.map((r) => r.department).filter(Boolean));
    return ["All", ...Array.from(depts)];
  }, [data]);

  // Apply filters
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // Search term (ID, Name, Doctor, Diagnosis)
      const matchesSearch =
        item.patient_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${item.first_name} ${item.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.attending_doctor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.primary_diagnosis.toLowerCase().includes(searchTerm.toLowerCase());

      // Department filter
      const matchesDept = selectedDept === "All" || item.department === selectedDept;

      // Risk filter
      const matchesRisk =
        selectedRisk === "All" ||
        item.readmission_risk_tier === selectedRisk ||
        item.deterioration_risk === selectedRisk;

      // Status filter (Inpatient vs Discharged)
      const isInpatient = item.discharge_date === "" || !item.discharge_date;
      const matchesStatus =
        patientStatus === "All" ||
        (patientStatus === "Inpatient" && isInpatient) ||
        (patientStatus === "Discharged" && !isInpatient);

      return matchesSearch && matchesDept && matchesRisk && matchesStatus;
    });
  }, [data, searchTerm, selectedDept, selectedRisk, patientStatus]);

  // Calculate Metrics
  const metrics = useMemo(() => {
    const total = filteredData.length;
    const inpatients = filteredData.filter((r) => r.discharge_date === "" || !r.discharge_date).length;
    const discharged = total - inpatients;
    
    // High clinical risk (NEWS2 >= 5 or High Readmission Risk)
    const highRisk = filteredData.filter(
      (r) => r.news2_score >= 5 || r.readmission_risk_tier === "HIGH" || r.hasSymptomAlert === true
    ).length;

    // Average medication compliance
    const validAdher = filteredData.filter((r) => r.med_adherence_pct !== "" && r.med_adherence_pct !== undefined);
    const avgAdherence = validAdher.length > 0
      ? Math.round(validAdher.reduce((acc, curr) => acc + parseFloat(curr.med_adherence_pct), 0) / validAdher.length)
      : 85;

    // Average length of stay
    const dischargedWithLOS = filteredData.filter((r) => r.length_of_stay !== null && r.length_of_stay > 0);
    const avgLOS = dischargedWithLOS.length > 0
      ? (dischargedWithLOS.reduce((acc, curr) => acc + curr.length_of_stay, 0) / dischargedWithLOS.length).toFixed(1)
      : "4.2";

    return { total, inpatients, discharged, highRisk, avgAdherence, avgLOS };
  }, [filteredData]);

  // Vitals Abnormalities & Patient Symptom Alert Finder
  const vitalAlerts = useMemo(() => {
    const alerts = [];
    filteredData
      .filter((r) => r.discharge_date === "" || !r.discharge_date) // Active patients only
      .forEach((r) => {
        const sys = parseInt(r.systolic_bp) || 120;
        const hr = parseInt(r.heart_rate) || 75;
        const spo2 = parseInt(r.oxygen_saturation) || 98;
        const temp = parseFloat(r.temperature_f) || 98.6;

        // Apply admin configurable thresholds
        const sysMax = vitalsThresholds.sysMax || 175;
        const sysMin = vitalsThresholds.sysMin || 90;
        const spo2Min = vitalsThresholds.spo2Min || 92;
        const hrMax = vitalsThresholds.hrMax || 120;
        const hrMin = vitalsThresholds.hrMin || 50;
        const tempMax = vitalsThresholds.tempMax || 101.5;
        const tempMin = vitalsThresholds.tempMin || 95.5;

        const isAbnormalVital = spo2 < spo2Min || sys > sysMax || sys < sysMin || hr > hrMax || hr < hrMin || temp > tempMax || temp < tempMin;
        const hasSymptomWarning = r.hasSymptomAlert === true;

        if (isAbnormalVital || hasSymptomWarning) {
          let reasons = [];
          if (spo2 < spo2Min) reasons.push(`Critical SpO2: ${spo2}%`);
          if (sys > sysMax) reasons.push(`Hypertension: ${sys} mmHg`);
          if (sys < sysMin) reasons.push(`Hypotension: ${sys} mmHg`);
          if (hr > hrMax) reasons.push(`Tachycardia: ${hr} bpm`);
          if (hr < hrMin) reasons.push(`Bradycardia: ${hr} bpm`);
          if (temp > tempMax) reasons.push(`High Fever: ${temp}°F`);
          if (temp < tempMin) reasons.push(`Hypothermia: ${temp}°F`);
          
          if (hasSymptomWarning && r.symptomDetails) {
            reasons.push(`Symptom Alert: ${r.symptomDetails}`);
          }

          alerts.push({
            id: r.patient_id,
            name: `${r.first_name} ${r.last_name}`,
            dept: r.department,
            reason: reasons.join(" | "),
            raw: r,
            isSymptomWarning: hasSymptomWarning
          });
        }
      });
    return alerts;
  }, [filteredData, vitalsThresholds]);

  // Aggregate monthly admissions & readmissions
  const trendsChartData = useMemo(() => {
    const monthlyStats = {};
    filteredData.forEach((item) => {
      if (!item.admission_date) return;
      const month = item.admission_date.substring(0, 7); // "YYYY-MM"
      if (!monthlyStats[month]) {
        monthlyStats[month] = { admissions: 0, readmissions: 0 };
      }
      monthlyStats[month].admissions++;
      if (item.readmission_flag === "True" || item.readmission_flag === true) {
        monthlyStats[month].readmissions++;
      }
    });

    const sortedMonths = Object.keys(monthlyStats).sort();
    const admissions = sortedMonths.map((m) => monthlyStats[m].admissions);
    const readmissions = sortedMonths.map((m) => monthlyStats[m].readmissions);
    
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const labels = sortedMonths.map((m) => {
      const [year, month] = m.split("-");
      const idx = parseInt(month) - 1;
      return `${monthNames[idx]} ${year}`;
    });

    return {
      labels: labels.length > 0 ? labels : ["No Data"],
      datasets: [
        {
          label: "Total Admissions",
          data: admissions.length > 0 ? admissions : [0],
          borderColor: "hsl(205, 90%, 43%)",
          backgroundColor: "rgba(205, 90%, 43%, 0.1)",
          fill: true,
          tension: 0.3
        },
        {
          label: "30-Day Readmissions",
          data: readmissions.length > 0 ? readmissions : [0],
          borderColor: "hsl(354, 75%, 52%)",
          backgroundColor: "rgba(354, 75%, 52%, 0.1)",
          fill: true,
          tension: 0.3
        }
      ]
    };
  }, [filteredData]);

  // Aggregate Top 5 Diagnoses
  const diagnosisChartData = useMemo(() => {
    const counts = {};
    filteredData.forEach((item) => {
      if (!item.primary_diagnosis) return;
      counts[item.primary_diagnosis] = (counts[item.primary_diagnosis] || 0) + 1;
    });

    const sortedDiags = Object.keys(counts)
      .map((k) => ({ name: k, count: counts[k] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      labels: sortedDiags.map((d) => d.name),
      datasets: [
        {
          label: "Patient Visits",
          data: sortedDiags.map((d) => d.count),
          backgroundColor: "hsl(175, 75%, 38%)",
          borderRadius: 6
        }
      ]
    };
  }, [filteredData]);

  // Mask sensitive Patient PII for Analyst role context
  const maskText = (text, type) => {
    if (role !== "analyst") return text;
    if (type === "name") {
      const [first, ...rest] = text.split(" ");
      const last = rest.join(" ");
      return `${first.charAt(0)}*** ${last.charAt(0) || "*"}***`;
    }
    if (type === "id") {
      return text.substring(0, 4) + "***";
    }
    return text;
  };

  const handleExportCSV = () => {
    const headers = [
      "Patient ID", "Full Name", "Age", "Gender", "Admission Date", "Discharge Date",
      "Department", "Attending Doctor", "Primary Diagnosis", "NEWS2 Score", "Deterioration Risk",
      "Readmission Probability", "Readmission Risk"
    ];

    const rows = filteredData.map((r) => [
      maskText(r.patient_id, "id"),
      maskText(`${r.first_name} ${r.last_name}`, "name"),
      r.age,
      r.gender,
      r.admission_date,
      r.discharge_date || "Attending Inpatient",
      r.department,
      r.attending_doctor,
      r.primary_diagnosis,
      r.news2_score,
      r.deterioration_risk,
      `${r.readmission_probability}%`,
      r.readmission_risk_tier
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `pulseflow_patient_cohort_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Filters Control Panel */}
      <div className="filter-panel-card">
        <div className="flex-row-between" style={{ marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Filter size={18} style={{ color: "var(--color-primary)" }} />
            <h4 style={{ fontSize: "0.95rem" }}>Filter Clinical Database</h4>
          </div>
          {(role === "admin" || role === "analyst") && (
            <button className="btn-secondary" onClick={handleExportCSV} style={{ padding: "6px 12px", fontSize: "0.80rem" }}>
              <Download size={14} /> Export Cleaned Cohort
            </button>
          )}
        </div>
        <div className="filters-grid">
          <div className="form-group">
            <label style={{ fontSize: "0.78rem" }}>Search Records</label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="ID, Name, Doctor, Diagnosis..."
                className="input-field"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ padding: "8px 12px 8px 32px", fontSize: "0.85rem" }}
              />
              <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            </div>
          </div>

          <div className="form-group">
            <label style={{ fontSize: "0.78rem" }}>Department</label>
            <select
              className="input-field"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              style={{ padding: "8px 12px", fontSize: "0.85rem" }}
            >
              {departmentsList.map((dept, idx) => (
                <option key={idx} value={dept}>
                  {dept === "All" ? "All Departments" : dept}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label style={{ fontSize: "0.78rem" }}>Clinical Risk Level</label>
            <select
              className="input-field"
              value={selectedRisk}
              onChange={(e) => setSelectedRisk(e.target.value)}
              style={{ padding: "8px 12px", fontSize: "0.85rem" }}
            >
              <option value="All">All Risk Profiles</option>
              <option value="HIGH">High Risk</option>
              <option value="MEDIUM">Medium Risk</option>
              <option value="LOW">Low Risk</option>
            </select>
          </div>

          <div className="form-group">
            <label style={{ fontSize: "0.78rem" }}>Patient Residency</label>
            <select
              className="input-field"
              value={patientStatus}
              onChange={(e) => setPatientStatus(e.target.value)}
              style={{ padding: "8px 12px", fontSize: "0.85rem" }}
            >
              <option value="All">All Intake</option>
              <option value="Inpatient">Active Inpatients</option>
              <option value="Discharged">Discharged Patients</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards Ribbon */}
      <div className="dashboard-metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <p>TOTAL PATIENTS</p>
            <Users size={16} />
          </div>
          <div className="metric-value">{metrics.total}</div>
          <div className="metric-footer neutral">Filtered sample intake</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <p>ACTIVE INPATIENTS</p>
            <Bed size={16} />
          </div>
          <div className="metric-value" style={{ color: "var(--color-primary)" }}>{metrics.inpatients}</div>
          <div className="metric-footer neutral">Occupying ward beds</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <p>HIGH-RISK ALERTS</p>
            <AlertTriangle size={16} />
          </div>
          <div className="metric-value" style={{ color: "var(--color-danger)" }}>{metrics.highRisk}</div>
          <div className="metric-footer down">Requires close surveillance</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <p>MED ADHERENCE</p>
            <Heart size={16} />
          </div>
          <div className="metric-value" style={{ color: "var(--color-success)" }}>{metrics.avgAdherence}%</div>
          <div className="metric-footer up">Average compliance</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <p>AVG STAY LENGTH</p>
            <TrendingUp size={16} />
          </div>
          <div className="metric-value">{metrics.avgLOS} Days</div>
          <div className="metric-footer neutral">Operational baseline</div>
        </div>
      </div>

      {/* Real-time Alerts Panel (Nurses/Doctors/Admins only, blocked for Analyst) */}
      {role !== "analyst" && vitalAlerts.length > 0 && (
        <div className="active-alerts-section">
          <div className="alerts-header">
            <AlertTriangle size={18} style={{ color: "var(--color-danger)" }} />
            <h3>Active Critical Patient Care Flags</h3>
            <span className="alerts-badge">{vitalAlerts.length}</span>
          </div>
          <div className="alerts-list">
            {vitalAlerts.map((alert, idx) => (
              <div key={idx} className="alert-item" style={{ 
                borderLeft: alert.isSymptomWarning ? "4px solid var(--color-danger)" : "3px solid var(--color-warning)",
                background: alert.isSymptomWarning ? "rgba(var(--color-danger-rgb), 0.05)" : "transparent"
              }}>
                <div className="alert-item-details">
                  <Heart size={18} className="alert-warning-icon" style={{ 
                    animation: "pulse-light 1.2s infinite",
                    color: alert.isSymptomWarning ? "var(--color-danger)" : "var(--color-warning)" 
                  }} />
                  <span className="alert-text">
                    <strong>{maskText(alert.name, "name")}</strong> ({alert.dept}) -{" "}
                    <span style={{ 
                      color: alert.isSymptomWarning ? "var(--color-danger)" : "var(--color-warning)", 
                      fontWeight: "600" 
                    }}>{alert.reason}</span>
                  </span>
                </div>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <span className="alert-time">{alert.isSymptomWarning ? "Patient Logged Alert" : "Bed Active"}</span>
                  <button className="alert-action-btn" onClick={() => onOpenProfile(alert.id)}>
                    Open Patient Record
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interactive Charts Panel (Analysts/Doctors/Admins can see this) */}
      <div className="dashboard-charts-grid">
        <div className="chart-card">
          <div className="chart-card-header">
            <h3>Monthly Admission vs. Readmission Trends</h3>
          </div>
          <div className="chart-container">
            <Line
              data={trendsChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: "top", labels: { boxWidth: 12, font: { family: "Inter" } } } },
                scales: {
                  y: { grid: { color: "var(--border-color)" }, ticks: { font: { family: "Inter" } } },
                  x: { grid: { display: false }, ticks: { font: { family: "Inter" } } }
                }
              }}
            />
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-card-header">
            <h3>Primary Diagnoses Intake</h3>
          </div>
          <div className="chart-container">
            <Bar
              data={diagnosisChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: "y",
                plugins: { legend: { display: false } },
                scales: {
                  y: { grid: { display: false }, ticks: { font: { family: "Inter" } } },
                  x: { grid: { color: "var(--border-color)" }, ticks: { font: { family: "Inter" } } }
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Cohorts and Records Database */}
      <div className="table-card">
        <div className="table-header-toolbar">
          <div>
            <h3 style={{ fontSize: "1rem" }}>Patient Intake Database Registry</h3>
            <p className="user-role" style={{ fontSize: "0.78rem", textTransform: "none", marginTop: "2px" }}>
              Showing {filteredData.length} records matching selection criteria.
            </p>
          </div>
          {comparisonList.length > 0 && (
            <button className="btn-primary" onClick={onOpenComparison}>
              Compare Selected Patients ({comparisonList.length})
            </button>
          )}
        </div>
        <div className="table-overflow-container">
          <table className="custom-data-table">
            <thead>
              <tr>
                <th>Patient ID</th>
                <th>Full Name</th>
                <th>Age</th>
                <th>Gender</th>
                <th>Department</th>
                <th>Diagnosis</th>
                <th>Attending Doctor</th>
                <th>Vitals Status</th>
                <th>Clinical Risk</th>
                <th>Readmit Probability</th>
                <th style={{ textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((patient) => {
                const isSelectedForCompare = comparisonList.includes(patient.patient_id);
                
                // Assess vital stability for badge
                const sys = parseInt(patient.systolic_bp) || 120;
                const hr = parseInt(patient.heart_rate) || 75;
                const spo2 = parseInt(patient.oxygen_saturation) || 98;
                const temp = parseFloat(patient.temperature_f) || 98.6;
                
                const sysMax = vitalsThresholds.sysMax || 175;
                const sysMin = vitalsThresholds.sysMin || 90;
                const spo2Min = vitalsThresholds.spo2Min || 92;
                const hrMax = vitalsThresholds.hrMax || 120;
                const hrMin = vitalsThresholds.hrMin || 50;
                const tempMax = vitalsThresholds.tempMax || 101.5;
                const tempMin = vitalsThresholds.tempMin || 95.5;

                const hasAbnormalVital = spo2 < spo2Min || sys > sysMax || sys < sysMin || hr > hrMax || hr < hrMin || temp > tempMax || temp < tempMin;

                return (
                  <tr key={patient.patient_id}>
                    <td style={{ fontWeight: "600" }}>{maskText(patient.patient_id, "id")}</td>
                    <td>{maskText(`${patient.first_name} ${patient.last_name}`, "name")}</td>
                    <td>{patient.age}</td>
                    <td>{patient.gender}</td>
                    <td>{patient.department}</td>
                    <td>{patient.primary_diagnosis}</td>
                    <td>{patient.attending_doctor}</td>
                    <td>
                      <span
                        className="risk-badge"
                        style={{
                          backgroundColor: (hasAbnormalVital || patient.hasSymptomAlert) ? "var(--color-danger-soft)" : "var(--color-success-soft)",
                          color: (hasAbnormalVital || patient.hasSymptomAlert) ? "var(--color-danger)" : "var(--color-success)"
                        }}
                      >
                        {patient.hasSymptomAlert ? "Symptom Alert" : hasAbnormalVital ? "Abnormal Vitals" : "Stable Vitals"}
                      </span>
                    </td>
                    <td>
                      <span className={`risk-badge ${patient.deterioration_risk.toLowerCase()}`}>
                        NEWS2: {patient.deterioration_risk}
                      </span>
                    </td>
                    <td>{patient.readmission_probability}%</td>
                    <td>
                      <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                        <button
                          className="btn-secondary"
                          onClick={() => onOpenProfile(patient.patient_id)}
                          style={{ padding: "6px 10px", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px" }}
                        >
                          <Eye size={12} /> {role === "analyst" ? "Open Data" : "Open Record"}
                        </button>
                        <button
                          className="btn-secondary"
                          onClick={() => {
                            if (isSelectedForCompare) {
                              onRemoveFromCompare(patient.patient_id);
                            } else {
                              onAddToCompare(patient.patient_id);
                            }
                          }}
                          style={{
                            padding: "6px 10px",
                            fontSize: "0.75rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            borderColor: isSelectedForCompare ? "var(--color-primary)" : "var(--border-color)",
                            color: isSelectedForCompare ? "var(--color-primary)" : "var(--text-main)"
                          }}
                        >
                          {isSelectedForCompare ? (
                            <>
                              <Minus size={12} /> Uncheck
                            </>
                          ) : (
                            <>
                              <Plus size={12} /> Compare
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
