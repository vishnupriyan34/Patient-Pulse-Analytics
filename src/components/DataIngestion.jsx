import React, { useState, useEffect } from "react";
import { UploadCloud, CheckCircle2, AlertCircle, ArrowRight, RefreshCw, Layers } from "lucide-react";
import { generateMockCSV } from "../utils/mockGenerator";

// Target standard fields schema
const targetSchema = [
  { key: "patient_id", name: "Patient ID", required: true, desc: "Unique patient identifier (PT-XXXXX)" },
  { key: "first_name", name: "First Name", required: true, desc: "Patient first name" },
  { key: "last_name", name: "Last Name", required: true, desc: "Patient last name" },
  { key: "date_of_birth", name: "Date of Birth", required: true, desc: "Patient birth date" },
  { key: "admission_date", name: "Admission Date", required: true, desc: "Hospital admission date" },
  { key: "discharge_date", name: "Discharge Date", required: false, desc: "Hospital discharge date" },
  { key: "gender", name: "Gender", required: false, desc: "Patient gender" },
  { key: "department", name: "Department", required: false, desc: "Attending department" },
  { key: "attending_doctor", name: "Attending Doctor", required: false, desc: "Admitting medical doctor" },
  { key: "primary_diagnosis", name: "Primary Diagnosis", required: false, desc: "Primary ICD-10 diagnosis" },
  { key: "systolic_bp", name: "Systolic BP", required: false, desc: "Systolic blood pressure (mmHg)" },
  { key: "diastolic_bp", name: "Diastolic BP", required: false, desc: "Diastolic blood pressure (mmHg)" },
  { key: "heart_rate", name: "Heart Rate", required: false, desc: "Pulse / Heart rate (bpm)" },
  { key: "oxygen_saturation", name: "Oxygen Saturation", required: false, desc: "Blood oxygen saturation SpO2 (%)" },
  { key: "temperature_f", name: "Body Temperature", required: false, desc: "Fahrenheit temperature (°F)" },
  { key: "med_adherence_pct", name: "Med Adherence %", required: false, desc: "Medication compliance percentage" },
  { key: "readmission_flag", name: "Readmitted?", required: false, desc: "Is readmitted within 30 days" }
];

// Fuzzy matching dictionary to auto-map columns
const fuzzyMappings = {
  patient_id: ["patient_id", "patientid", "patid", "id", "pid", "medical_record_number", "mrn"],
  first_name: ["first_name", "firstname", "first", "fname", "given_name"],
  last_name: ["last_name", "lastname", "last", "lname", "surname", "family_name"],
  date_of_birth: ["date_of_birth", "dob", "birth_date", "birthdate", "patdob"],
  admission_date: ["admission_date", "admit_date", "admission", "admitted", "admitted_at"],
  discharge_date: ["discharge_date", "discharged", "discharge", "discharged_at"],
  gender: ["gender", "sex", "patient_gender"],
  department: ["department", "dept", "ward", "clinic_area"],
  attending_doctor: ["attending_doctor", "doctor", "physician", "doc", "attending"],
  primary_diagnosis: ["primary_diagnosis", "diagnosis", "diag", "condition", "icd10"],
  systolic_bp: ["systolic_bp", "systolic", "bp_sys", "blood_pressure_systolic", "sysbp"],
  diastolic_bp: ["diastolic_bp", "diastolic", "bp_dia", "blood_pressure_diastolic", "diabp"],
  heart_rate: ["heart_rate", "hr", "pulse", "bpm", "heartrate"],
  oxygen_saturation: ["oxygen_saturation", "spo2", "o2_sat", "oxygen", "sato2"],
  temperature_f: ["temperature_f", "temp", "temperature", "body_temp", "temp_f"],
  med_adherence_pct: ["med_adherence_pct", "medication_adherence", "adherence", "compliance", "med_pct"],
  readmission_flag: ["readmission_flag", "readmitted", "readmission", "returned"]
};

export default function DataIngestion({ onIngestionComplete, onResetStepper }) {
  const [fileName, setFileName] = useState("");
  const [fileHeaders, setFileHeaders] = useState([]);
  const [parsedRows, setParsedRows] = useState([]);
  const [columnMap, setColumnMap] = useState({});
  const [isMapping, setIsMapping] = useState(false);
  const [importMode, setImportMode] = useState("replace"); // 'replace' or 'append'
  const [errorMsg, setErrorMsg] = useState("");

  // Simple CSV text parser (handles commas within quotes)
  const parseCSV = (text) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
    if (lines.length < 2) return { headers: [], rows: [] };
    
    // Parse header line
    const headers = parseCSVLine(lines[0]);
    
    // Parse data lines
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length === headers.length) {
        rows.push(values);
      }
    }
    return { headers, rows };
  };

  const parseCSVLine = (line) => {
    const result = [];
    let insideQuote = false;
    let entry = "";
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === ',' && !insideQuote) {
        result.push(entry.trim());
        entry = "";
      } else {
        entry += char;
      }
    }
    result.push(entry.trim());
    return result;
  };

  const handleFileUpload = (e) => {
    setErrorMsg("");
    const file = e.target.files[0];
    if (!file) return;
    processFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setErrorMsg("");
    const file = e.dataTransfer.files[0];
    if (file) {
      if (file.name.endsWith(".csv") || file.name.endsWith(".xlsx")) {
        processFile(file);
      } else {
        setErrorMsg("Invalid file format. Please upload a standard CSV spreadsheet.");
      }
    }
  };

  const processFile = (file) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const { headers, rows } = parseCSV(text);
        
        if (headers.length === 0) {
          setErrorMsg("Could not parse file. The spreadsheet appears to be empty or misformatted.");
          return;
        }
        
        setFileHeaders(headers);
        setParsedRows(rows);
        autoMapHeaders(headers);
        setIsMapping(true);
      } catch (err) {
        setErrorMsg("Failed to read file: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  // Perform fuzzy header match
  const autoMapHeaders = (headers) => {
    const maps = {};
    targetSchema.forEach(field => {
      const candidates = fuzzyMappings[field.key] || [];
      const match = headers.find(h => {
        const normalized = h.toLowerCase().trim().replace(/[\s_-]+/g, "");
        return candidates.some(cand => normalized.includes(cand.replace(/[\s_-]+/g, "")));
      });
      if (match) {
        maps[field.key] = match;
      } else {
        maps[field.key] = "";
      }
    });
    setColumnMap(maps);
  };

  const handleMapChange = (schemaKey, value) => {
    setColumnMap(prev => ({
      ...prev,
      [schemaKey]: value
    }));
  };

  const loadMockData = () => {
    setErrorMsg("");
    const csvContent = generateMockCSV(75);
    const { headers, rows } = parseCSV(csvContent);
    setFileName("pulseflow_mock_clinical_dataset.csv");
    setFileHeaders(headers);
    setParsedRows(rows);
    autoMapHeaders(headers);
    setIsMapping(true);
  };

  const executeMapping = () => {
    // Check required fields mapped
    const unmappedRequired = targetSchema
      .filter(field => field.required)
      .filter(field => !columnMap[field.key]);
      
    if (unmappedRequired.length > 0) {
      setErrorMsg(`Required fields must be mapped: ${unmappedRequired.map(f => f.name).join(", ")}`);
      return;
    }
    
    // Structure dataset according to standard schema
    const formattedData = parsedRows.map(row => {
      const record = {};
      targetSchema.forEach(field => {
        const fileColName = columnMap[field.key];
        if (fileColName) {
          const colIdx = fileHeaders.indexOf(fileColName);
          record[field.key] = colIdx !== -1 ? row[colIdx] : "";
        } else {
          record[field.key] = "";
        }
      });
      return record;
    });

    onIngestionComplete(parsedRows.length, formattedData, columnMap, importMode);
  };

  return (
    <div className="upload-grid">
      {!isMapping ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div
            className="dropzone-container"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => document.getElementById("file-upload").click()}
          >
            <UploadCloud size={64} className="dropzone-icon" />
            <div>
              <h3>Upload Clinical Raw Spreadsheets</h3>
              <p className="empty-state-text" style={{ marginTop: "6px" }}>
                Drag and drop your patient records file here, or click to select from your browser.
                Supports standard <strong>CSV</strong> file exports.
              </p>
            </div>
            <input
              id="file-upload"
              type="file"
              accept=".csv"
              className="file-input"
              onChange={handleFileUpload}
            />
          </div>

          <div className="empty-state-container">
            <h3>No spreadsheet ready?</h3>
            <p className="empty-state-text">
              Generate a realistic patient record dataset containing duplicates, formatting errors, 
              and vitals outliers to test the cleaning mapper immediately.
            </p>
            <button className="btn-primary" onClick={loadMockData}>
              Generate & Load Mock EHR Dataset
            </button>
          </div>
        </div>
      ) : (
        <div className="mapper-card">
          <div className="flex-row-between" style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "16px" }}>
            <div>
              <h2>Schema Header Mapper</h2>
              <p className="user-role" style={{ fontSize: "0.82rem", textTransform: "none", marginTop: "4px" }}>
                Active File: <strong>{fileName}</strong> ({parsedRows.length} visits detected)
              </p>
            </div>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <div className="flex-gap-12" style={{ borderRight: "1px solid var(--border-color)", paddingRight: "16px" }}>
                <label style={{ fontSize: "0.82rem", fontWeight: "600", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={importMode === "replace"}
                    onChange={() => setImportMode("replace")}
                  />
                  <RefreshCw size={14} /> Replace Current Data
                </label>
                <label style={{ fontSize: "0.82rem", fontWeight: "600", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
                  <input
                    type="radio"
                    name="importMode"
                    value="append"
                    checked={importMode === "append"}
                    onChange={() => setImportMode("append")}
                  />
                  <Layers size={14} /> Append/Merge Records
                </label>
              </div>
              <button className="btn-secondary" onClick={() => { setIsMapping(false); setFileName(""); }}>
                Cancel
              </button>
              <button className="btn-primary" onClick={executeMapping}>
                Map and Validate <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="custom-alert-banner danger">
              <AlertCircle size={20} />
              <div className="alert-banner-content">
                <h4>Mapping Alignment Error</h4>
                <p>{errorMsg}</p>
              </div>
            </div>
          )}

          <div style={{ maxHeight: "400px", overflowY: "auto", paddingRight: "8px" }}>
            <div className="mapper-rows-container">
              {targetSchema.map((field) => {
                const isMapped = !!columnMap[field.key];
                return (
                  <div key={field.key} className="mapper-row">
                    <div>
                      <span className="target-field-name">{field.name}</span>
                      {field.required && <span className="target-field-required"> *</span>}
                      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>{field.desc}</p>
                    </div>
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <ArrowRight size={16} style={{ color: "var(--text-muted)" }} />
                    </div>
                    <div>
                      <select
                        className="input-field"
                        value={columnMap[field.key] || ""}
                        onChange={(e) => handleMapChange(field.key, e.target.value)}
                        style={{ padding: "8px 12px", fontSize: "0.88rem" }}
                      >
                        <option value="">-- Dropdown Column Selection --</option>
                        {fileHeaders.map((head, idx) => (
                          <option key={idx} value={head}>
                            {head}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <span className={`map-status-badge ${isMapped ? "mapped" : "missing"}`}>
                        {isMapped ? "Field Linked" : field.required ? "Required" : "Optional Field"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
