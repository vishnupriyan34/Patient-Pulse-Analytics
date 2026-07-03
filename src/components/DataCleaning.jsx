import React, { useState, useEffect } from "react";
import { CheckCircle2, CopyMinus, Trash2, HelpCircle, Layers, RefreshCw } from "lucide-react";

// Standard clinical median values for imputations
const CLINICAL_MEDIANS = {
  systolic_bp: 120,
  diastolic_bp: 80,
  heart_rate: 75,
  oxygen_saturation: 98,
  temperature_f: 98.6,
  med_adherence_pct: 85
};

export default function DataCleaning({ rawRecords, onCleaningComplete }) {
  const [cleaningLogs, setCleaningLogs] = useState({
    duplicatesRemoved: 0,
    missingImputed: 0,
    formattingFixed: 0,
    datesCorrected: 0
  });
  const [cleanedRecords, setCleanedRecords] = useState([]);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    // Run validation pipeline on rawRecords
    setTimeout(() => {
      executeCleaningPipeline();
    }, 1200); // Simulate pipeline loading
  }, [rawRecords]);

  // Try to standardize different date strings to YYYY-MM-DD
  const cleanDateStr = (dateStr) => {
    if (!dateStr || dateStr.trim() === "") return "";
    const cleanStr = dateStr.trim();
    
    // Check if ISO already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
      return cleanStr;
    }
    
    // Check if MM/DD/YYYY or M/D/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(cleanStr)) {
      const [m, d, y] = cleanStr.split("/");
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    
    // Check if DD-MM-YYYY or D-M-YYYY
    if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(cleanStr)) {
      const [d, m, y] = cleanStr.split("-");
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    
    // Check if YYYY.MM.DD
    if (/^\d{4}\.\d{2}\.\d{2}$/.test(cleanStr)) {
      return cleanStr.replace(/\./g, "-");
    }
    
    return cleanStr; // Return as-is if unrecognized
  };

  // Convert numbers containing characters (e.g. "120 mmHg")
  const cleanNumberValue = (val) => {
    if (val === undefined || val === null || val === "") return "";
    const stringVal = String(val).trim();
    
    // Strip everything except numbers and decimal point
    const numericPart = stringVal.replace(/[^0-9.]/g, "");
    if (numericPart === "") return "";
    
    const parsed = parseFloat(numericPart);
    return isNaN(parsed) ? "" : parsed;
  };

  // Normalize category texts (e.g. " cardiology" -> "Cardiology")
  const cleanCategory = (text) => {
    if (!text || text.trim() === "") return "Unknown";
    const cleaned = text.trim();
    
    // Capitalize first letter, lowercase rest
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
  };

  const executeCleaningPipeline = () => {
    let duplicateCount = 0;
    let imputationCount = 0;
    let formatCount = 0;
    let dateCount = 0;

    const seenVisits = new Set();
    const uniqueRecords = [];

    rawRecords.forEach((record) => {
      // De-duplication key: PatientID + AdmissionDate
      const dupKey = `${record.patient_id?.trim().toLowerCase()}_${record.admission_date?.trim()}`;
      
      if (seenVisits.has(dupKey)) {
        duplicateCount++;
      } else {
        seenVisits.add(dupKey);
        uniqueRecords.push(record);
      }
    });

    const processed = uniqueRecords.map((record) => {
      const cleanRecord = { ...record };
      cleanRecord.imputation_flags = [];

      // 1. Patient ID capitalization check
      if (cleanRecord.patient_id && cleanRecord.patient_id !== cleanRecord.patient_id.toUpperCase()) {
        cleanRecord.patient_id = cleanRecord.patient_id.toUpperCase();
        formatCount++;
      }

      // 2. Date standardizations
      const cleanDob = cleanDateStr(cleanRecord.date_of_birth);
      if (cleanDob !== cleanRecord.date_of_birth) {
        cleanRecord.date_of_birth = cleanDob;
        dateCount++;
      }
      
      const cleanAdmission = cleanDateStr(cleanRecord.admission_date);
      if (cleanAdmission !== cleanRecord.admission_date) {
        cleanRecord.admission_date = cleanAdmission;
        dateCount++;
      }

      const cleanDischarge = cleanDateStr(cleanRecord.discharge_date);
      if (cleanDischarge !== cleanRecord.discharge_date) {
        cleanRecord.discharge_date = cleanDischarge;
        dateCount++;
      }

      // 3. Category normalizations
      const cleanDept = cleanCategory(cleanRecord.department);
      if (cleanDept !== cleanRecord.department) {
        cleanRecord.department = cleanDept;
        formatCount++;
      }

      const cleanGender = cleanCategory(cleanRecord.gender);
      if (cleanGender !== cleanRecord.gender) {
        cleanRecord.gender = cleanGender;
        formatCount++;
      }

      // 4. Vitals text scrubbing & imputation
      const vitalsFields = ["systolic_bp", "diastolic_bp", "heart_rate", "oxygen_saturation", "temperature_f", "med_adherence_pct"];
      vitalsFields.forEach(field => {
        const rawVal = cleanRecord[field];
        let cleanedVal = cleanNumberValue(rawVal);
        
        if (rawVal !== cleanedVal.toString() && rawVal !== "") {
          formatCount++;
        }
        
        // If empty, impute median
        if (cleanedVal === "") {
          cleanedVal = CLINICAL_MEDIANS[field];
          imputationCount++;
          cleanRecord.imputation_flags.push(field);
        }
        
        cleanRecord[field] = cleanedVal;
      });

      return cleanRecord;
    });

    setCleaningLogs({
      duplicatesRemoved: duplicateCount,
      missingImputed: imputationCount,
      formattingFixed: formatCount,
      datesCorrected: dateCount
    });
    setCleanedRecords(processed);
    setIsProcessing(false);
  };

  const handleProceed = () => {
    onCleaningComplete(cleanedRecords);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <h2>Data Cleaning & Integrity Validation</h2>
        <p className="user-role" style={{ fontSize: "0.82rem", textTransform: "none", marginTop: "4px" }}>
          Scanning records, identifying formatting anomalies, and checking clinical variables.
        </p>
      </div>

      {isProcessing ? (
        <div className="empty-state-container">
          <div className="logo-icon" style={{ animation: "pulse-light 1.5s infinite" }}>
            <RefreshCw size={48} />
          </div>
          <h3>Executing Ingested Verification Rules...</h3>
          <p className="empty-state-text">
            Checking duplicates, resolving empty vitals, and converting calendar strings to standard ISO formats.
          </p>
        </div>
      ) : (
        <>
          <div className="clean-stat-grid">
            <div className="clean-stat-card">
              <div className="clean-stat-icon green">
                <CheckCircle2 size={24} />
              </div>
              <div className="clean-stat-details">
                <h4>{cleanedRecords.length}</h4>
                <p>Cleaned Visits</p>
              </div>
            </div>

            <div className="clean-stat-card">
              <div className="clean-stat-icon red">
                <CopyMinus size={24} />
              </div>
              <div className="clean-stat-details">
                <h4>{cleaningLogs.duplicatesRemoved}</h4>
                <p>Duplicates Removed</p>
              </div>
            </div>

            <div className="clean-stat-card">
              <div className="clean-stat-icon amber">
                <HelpCircle size={24} />
              </div>
              <div className="clean-stat-details">
                <h4>{cleaningLogs.missingImputed}</h4>
                <p>Missing Cells Filled</p>
              </div>
            </div>

            <div className="clean-stat-card">
              <div className="clean-stat-icon blue">
                <Layers size={24} />
              </div>
              <div className="clean-stat-details">
                <h4>{cleaningLogs.formattingFixed + cleaningLogs.datesCorrected}</h4>
                <p>Formatting Normalizations</p>
              </div>
            </div>
          </div>

          <div className="custom-alert-banner success" style={{ margin: 0 }}>
            <CheckCircle2 size={20} style={{ flexShrink: 0, marginTop: "2px" }} />
            <div className="alert-banner-content">
              <h4>Clean Pipeline Executed Successfully</h4>
              <p>
                Parsed {rawRecords.length} total rows. Standardized case strings for departments, 
                imputed clinical medians for empty vitals, and resolved duplicate entries. 
                Preview the sanitized records table below.
              </p>
            </div>
          </div>

          <div className="table-card">
            <div className="table-header-toolbar">
              <h3 style={{ fontSize: "1rem" }}>Sanitized Database Preview (First 15 Rows)</h3>
              <button className="btn-primary" onClick={handleProceed}>
                Accept and Run Modeling
              </button>
            </div>
            <div className="table-overflow-container">
              <table className="custom-data-table">
                <thead>
                  <tr>
                    <th>Patient ID</th>
                    <th>First Name</th>
                    <th>Last Name</th>
                    <th>Date of Birth</th>
                    <th>Admission Date</th>
                    <th>Discharge Date</th>
                    <th>Department</th>
                    <th>Attending Doctor</th>
                    <th>Primary Diagnosis</th>
                    <th>Systolic BP (mmHg)</th>
                    <th>Oxygen saturation (%)</th>
                    <th>Audit Logs</th>
                  </tr>
                </thead>
                <tbody>
                  {cleanedRecords.slice(0, 15).map((rec, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: "600" }}>{rec.patient_id}</td>
                      <td>{rec.first_name}</td>
                      <td>{rec.last_name}</td>
                      <td>{rec.date_of_birth}</td>
                      <td>{rec.admission_date}</td>
                      <td>{rec.discharge_date || <span style={{ color: "var(--color-primary)", fontWeight: "600" }}>Attending Inpatient</span>}</td>
                      <td>{rec.department}</td>
                      <td>{rec.attending_doctor}</td>
                      <td>{rec.primary_diagnosis}</td>
                      <td>{rec.systolic_bp}</td>
                      <td>{rec.oxygen_saturation}%</td>
                      <td>
                        {rec.imputation_flags.length > 0 ? (
                          <span style={{ color: "var(--color-warning)", fontSize: "0.78rem", fontWeight: "600" }}>
                            Imputed: {rec.imputation_flags.join(", ")}
                          </span>
                        ) : (
                          <span style={{ color: "var(--color-success)", fontSize: "0.78rem", fontWeight: "600" }}>Sanitized</span>
                        )}
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
