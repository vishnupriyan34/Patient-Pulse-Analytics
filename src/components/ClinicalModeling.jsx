import React, { useState, useEffect } from "react";
import { CheckCircle2, ShieldAlert, Cpu, Award, TrendingUp, HelpCircle } from "lucide-react";

export default function ClinicalModeling({ cleanedRecords, onModelingComplete }) {
  const [isModeling, setIsModeling] = useState(true);
  const [modeledRecords, setModeledRecords] = useState([]);
  const [modelSummary, setModelSummary] = useState({
    totalProcessed: 0,
    criticalDeterioration: 0,
    highReadmissionRisk: 0,
    averageAge: 0
  });

  useEffect(() => {
    setTimeout(() => {
      executeClinicalModels();
    }, 1200); // Simulate model calculations
  }, [cleanedRecords]);

  // Calculate patient Age from DOB relative to Admission Date
  const calculateAge = (dobStr, admitStr) => {
    if (!dobStr || dobStr === "") return 45; // default fallback
    const dob = new Date(dobStr);
    const admit = admitStr ? new Date(admitStr) : new Date();
    
    let age = admit.getFullYear() - dob.getFullYear();
    const monthDiff = admit.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && admit.getDate() < dob.getDate())) {
      age--;
    }
    return isNaN(age) || age < 0 ? 45 : age;
  };

  // Group age into clinical cohorts
  const getAgeCohort = (age) => {
    if (age < 18) return "Child (<18)";
    if (age < 65) return "Adult (18-64)";
    if (age < 80) return "Senior (65-79)";
    return "Geriatric (80+)";
  };

  // Calculate Length of Stay (LOS) in days
  const calculateLOS = (admitStr, dischargeStr) => {
    if (!dischargeStr || dischargeStr === "") return null; // Still admitted
    const admit = new Date(admitStr);
    const discharge = new Date(dischargeStr);
    
    const diffTime = Math.abs(discharge - admit);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return isNaN(diffDays) ? 1 : diffDays;
  };

  // Compute NEWS2 Score (National Early Warning Score)
  const calculateNEWS2 = (rec) => {
    let score = 0;
    const sys = parseInt(rec.systolic_bp) || 120;
    const hr = parseInt(rec.heart_rate) || 75;
    const spo2 = parseInt(rec.oxygen_saturation) || 98;
    const temp = parseFloat(rec.temperature_f) || 98.6;

    // Systolic BP score
    if (sys <= 90 || sys >= 220) score += 3;
    else if (sys >= 91 && sys <= 100) score += 2;
    else if (sys >= 101 && sys <= 110) score += 1;

    // Heart rate score
    if (hr <= 40 || hr >= 131) score += 3;
    else if (hr >= 41 && hr <= 50) score += 1;
    else if (hr >= 91 && hr <= 110) score += 1;
    else if (hr >= 111 && hr <= 130) score += 2;

    // SpO2 score
    if (spo2 <= 91) score += 3;
    else if (spo2 >= 92 && spo2 <= 93) score += 2;
    else if (spo2 >= 94 && spo2 <= 95) score += 1;

    // Temperature score
    if (temp <= 95.0 || temp >= 102.4) score += 3;
    else if ((temp >= 95.1 && temp <= 96.8) || (temp >= 100.5 && temp <= 102.3)) score += 1;

    return score;
  };

  // Calculate Readmission Risk Score (0 to 100%)
  const calculateReadmissionScore = (rec, age) => {
    let points = 0;
    const diag = rec.primary_diagnosis ? rec.primary_diagnosis.toLowerCase() : "";
    const adherence = parseFloat(rec.med_adherence_pct) || 100;
    const isReadmitFlag = rec.readmission_flag === "True" || rec.readmission_flag === true;

    // 1. Chronic condition risk weight (+30)
    const chronicConditions = ["heart failure", "stroke", "copd", "cancer", "sepsis", "diabetes"];
    if (chronicConditions.some(cond => diag.includes(cond))) {
      points += 30;
    }

    // 2. Elderly patient risk weight (+20)
    if (age >= 75) {
      points += 20;
    } else if (age >= 65) {
      points += 10;
    }

    // 3. Medication non-adherence risk weight (+35)
    if (adherence < 70) {
      points += 35;
    } else if (adherence < 85) {
      points += 15;
    }

    // 4. Prior readmission history (+15)
    if (isReadmitFlag) {
      points += 15;
    }

    return Math.min(points, 100);
  };

  const executeClinicalModels = () => {
    let totalAge = 0;
    let criticalDeterCount = 0;
    let highReadmitCount = 0;

    const processed = cleanedRecords.map(rec => {
      const modeled = { ...rec };
      
      // Calculate age and cohorts
      const age = calculateAge(modeled.date_of_birth, modeled.admission_date);
      modeled.age = age;
      modeled.age_group = getAgeCohort(age);
      totalAge += age;

      // Length of stay
      modeled.length_of_stay = calculateLOS(modeled.admission_date, modeled.discharge_date);

      // Execute NEWS2 early deterioration warning model
      const news2Score = calculateNEWS2(modeled);
      modeled.news2_score = news2Score;
      
      if (news2Score >= 5) {
        modeled.deterioration_risk = "HIGH";
        criticalDeterCount++;
      } else if (news2Score >= 3) {
        modeled.deterioration_risk = "MEDIUM";
      } else {
        modeled.deterioration_risk = "LOW";
      }

      // Execute readmission probability model
      const readmissionProb = calculateReadmissionScore(modeled, age);
      modeled.readmission_probability = readmissionProb;

      if (readmissionProb >= 60) {
        modeled.readmission_risk_tier = "HIGH";
        highReadmitCount++;
      } else if (readmissionProb >= 30) {
        modeled.readmission_risk_tier = "MEDIUM";
      } else {
        modeled.readmission_risk_tier = "LOW";
      }

      return modeled;
    });

    setModeledRecords(processed);
    setModelSummary({
      totalProcessed: processed.length,
      criticalDeterioration: criticalDeterCount,
      highReadmissionRisk: highReadmitCount,
      averageAge: Math.round(totalAge / processed.length)
    });
    setIsModeling(false);
  };

  const handleProceed = () => {
    onModelingComplete(modeledRecords);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <h2>Clinical Risk Modeling & Feature Engineering</h2>
        <p className="user-role" style={{ fontSize: "0.82rem", textTransform: "none", marginTop: "4px" }}>
          Executing the NEWS2 clinical warning scoring model and mapping readmission probability indexes.
        </p>
      </div>

      {isModeling ? (
        <div className="empty-state-container">
          <div className="logo-icon" style={{ animation: "pulse-light 1.5s infinite" }}>
            <Cpu size={48} />
          </div>
          <h3>Running Clinical Predictive Rules...</h3>
          <p className="empty-state-text">
            Deriving age groups, calculating Length of Stay (LOS), and computing multi-factor risk scores.
          </p>
        </div>
      ) : (
        <>
          <div className="clean-stat-grid">
            <div className="clean-stat-card">
              <div className="clean-stat-icon blue">
                <Cpu size={24} />
              </div>
              <div className="clean-stat-details">
                <h4>{modelSummary.totalProcessed}</h4>
                <p>Scored Records</p>
              </div>
            </div>

            <div className="clean-stat-card">
              <div className="clean-stat-icon red">
                <ShieldAlert size={24} />
              </div>
              <div className="clean-stat-details">
                <h4>{modelSummary.criticalDeterioration}</h4>
                <p>NEWS2 Critical Watch (Score &ge; 5)</p>
              </div>
            </div>

            <div className="clean-stat-card">
              <div className="clean-stat-icon amber">
                <TrendingUp size={24} />
              </div>
              <div className="clean-stat-details">
                <h4>{modelSummary.highReadmissionRisk}</h4>
                <p>High Readmission Risk Tier</p>
              </div>
            </div>

            <div className="clean-stat-card">
              <div className="clean-stat-icon green">
                <Award size={24} />
              </div>
              <div className="clean-stat-details">
                <h4>{modelSummary.averageAge} yrs</h4>
                <p>Average Cohort Age</p>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            <div className="chart-card">
              <h3 style={{ fontSize: "1rem" }}>NEWS2 Early Warning System</h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: "1.6" }}>
                The NEWS2 index aggregates risk points from key clinical vital categories. A cumulative score 
                of <strong>5 or more</strong> indicates high risk of inpatient clinical deterioration, requiring 
                urgent clinical review by attending critical care teams.
              </p>
              <ul style={{ fontSize: "0.82rem", paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "6px" }}>
                <li><strong>BP Systolic:</strong> Score +3 if &le;90 or &ge;220 mmHg</li>
                <li><strong>Heart Rate:</strong> Score +3 if &le;40 or &ge;131 bpm</li>
                <li><strong>Oxygen saturation:</strong> Score +3 if &le;91%</li>
                <li><strong>Temperature:</strong> Score +3 if &le;95°F or &ge;102.4°F</li>
              </ul>
            </div>

            <div className="chart-card">
              <h3 style={{ fontSize: "1rem" }}>30-Day Readmission Risk Index</h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: "1.6" }}>
                Calculates the likelihood of a patient returning within 30 days of discharge. Points are 
                weighted based on chronic diagnosis profiles, elderly status, medication adherence, 
                and prior hospitalization history.
              </p>
              <ul style={{ fontSize: "0.82rem", paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "6px" }}>
                <li><strong>Chronic condition match:</strong> +30 points (Sepsis, Heart Failure, stroke etc)</li>
                <li><strong>Elderly patient (Age &ge; 75):</strong> +20 points</li>
                <li><strong>Medication non-compliance (Adherence &lt; 70%):</strong> +35 points</li>
                <li><strong>Prior readmission:</strong> +15 points</li>
              </ul>
            </div>
          </div>

          <div className="table-card">
            <div className="table-header-toolbar">
              <h3 style={{ fontSize: "1rem" }}>Clinical Scoring Verification Matrix</h3>
              <button className="btn-primary" onClick={handleProceed}>
                Accept and Open Dashboard
              </button>
            </div>
            <div className="table-overflow-container">
              <table className="custom-data-table">
                <thead>
                  <tr>
                    <th>Patient ID</th>
                    <th>Name</th>
                    <th>Age</th>
                    <th>Age Cohort</th>
                    <th>Length of Stay</th>
                    <th>Primary Diagnosis</th>
                    <th>Medication Adherence</th>
                    <th>NEWS2 Score</th>
                    <th>Deterioration Tier</th>
                    <th>Readmit Prob %</th>
                    <th>Readmit Risk Tier</th>
                  </tr>
                </thead>
                <tbody>
                  {modeledRecords.slice(0, 15).map((rec, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: "600" }}>{rec.patient_id}</td>
                      <td>{rec.first_name} {rec.last_name}</td>
                      <td>{rec.age}</td>
                      <td>
                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{rec.age_group}</span>
                      </td>
                      <td>
                        {rec.length_of_stay !== null ? `${rec.length_of_stay} Days` : <span style={{ color: "var(--color-primary)", fontWeight: "600" }}>Active Bed</span>}
                      </td>
                      <td>{rec.primary_diagnosis}</td>
                      <td>{rec.med_adherence_pct}%</td>
                      <td style={{ fontWeight: "700", textAlign: "center" }}>{rec.news2_score}</td>
                      <td>
                        <span className={`risk-badge ${rec.deterioration_risk.toLowerCase()}`}>
                          {rec.deterioration_risk}
                        </span>
                      </td>
                      <td style={{ fontWeight: "700", textAlign: "center" }}>{rec.readmission_probability}%</td>
                      <td>
                        <span className={`risk-badge ${rec.readmission_risk_tier.toLowerCase()}`}>
                          {rec.readmission_risk_tier}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
