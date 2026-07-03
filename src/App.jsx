import React, { useState, useEffect, useRef } from "react";
import Login from "./components/Login";
import DataIngestion from "./components/DataIngestion";
import DataCleaning from "./components/DataCleaning";
import ClinicalModeling from "./components/ClinicalModeling";
import Dashboard from "./components/Dashboard";
import PatientProfile from "./components/PatientProfile";
import PatientComparison from "./components/PatientComparison";
import InsightsPanel from "./components/InsightsPanel";
import PatientPortal from "./components/PatientPortal";
import { generateMockCSV } from "./utils/mockGenerator";
import {
  Heart,
  Moon,
  Sun,
  LayoutDashboard,
  Upload,
  Lightbulb,
  ShieldCheck,
  LogOut,
  Sliders,
  AlertCircle,
  FileSpreadsheet
} from "lucide-react";

export default function App() {
  // Session Authentication state
  const [userRole, setUserRole] = useState(null);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [loggedPatientId, setLoggedPatientId] = useState("PT-10001");
  const [theme, setTheme] = useState(() => localStorage.getItem("pulseflow-theme") || "light");

  // Stepper Flow (1: Upload, 2: Mapping/Clean, 3: Modeling, 4: Unlocked Dashboard)
  const [currentStep, setCurrentStep] = useState(4); // Default to 4 since we preload
  const [activeTab, setActiveTab] = useState("dashboard");

  // Clinical records states
  const [rawRecords, setRawRecords] = useState([]);
  const [cleanedRecords, setCleanedRecords] = useState([]);
  const [modeledRecords, setModeledRecords] = useState([]);
  const [originalRecordsCount, setOriginalRecordsCount] = useState(0);

  // Profile modal and comparison list state
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [comparisonList, setComparisonList] = useState([]);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);

  // Idle Timeout States
  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const lastActiveTime = useRef(Date.now());
  const warnTimerRef = useRef(null);
  const logoutTimerRef = useRef(null);

  // Admin Configurable Vital Thresholds
  const [vitalsThresholds, setVitalsThresholds] = useState({
    sysMax: 175,
    sysMin: 90,
    spo2Min: 92,
    hrMax: 120,
    hrMin: 50,
    tempMax: 101.5,
    tempMin: 95.5
  });

  // Pre-load default database on application startup
  useEffect(() => {
    loadInitialMockDatabase();
  }, []);

  const loadInitialMockDatabase = () => {
    try {
      const csvContent = generateMockCSV(45);
      const lines = csvContent.split(/\r?\n/).filter(line => line.trim() !== "");
      if (lines.length < 2) return;
      
      const headers = lines[0].split(",");
      const parsed = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",");
        if (values.length === headers.length) {
          const rec = {};
          headers.forEach((h, idx) => {
            rec[h] = values[idx];
          });
          parsed.push(rec);
        }
      }

      // Simplified cleaning logic
      const cleaned = parsed.map(rec => {
        const cleanRec = { ...rec, imputation_flags: [] };
        if (cleanRec.patient_id) cleanRec.patient_id = cleanRec.patient_id.toUpperCase();
        
        const numFields = ["systolic_bp", "diastolic_bp", "heart_rate", "oxygen_saturation", "temperature_f", "med_adherence_pct"];
        numFields.forEach(f => {
          let val = String(cleanRec[f] || "").replace(/[^0-9.]/g, "");
          cleanRec[f] = val === "" ? (f === "oxygen_saturation" ? 98 : f === "systolic_bp" ? 120 : f === "diastolic_bp" ? 80 : f === "heart_rate" ? 75 : f === "temperature_f" ? 98.6 : 85) : parseFloat(val);
        });
        return cleanRec;
      });

      // Simplified scoring logic
      const modeled = cleaned.map(rec => {
        const modeledRec = { ...rec };
        
        modeledRec.age = 45;
        if (modeledRec.date_of_birth) {
          const dob = new Date(modeledRec.date_of_birth);
          const age = new Date().getFullYear() - dob.getFullYear();
          modeledRec.age = isNaN(age) ? 45 : age;
        }
        modeledRec.age_group = modeledRec.age < 18 ? "Child (<18)" : modeledRec.age < 65 ? "Adult (18-64)" : "Senior (65+)";
        modeledRec.length_of_stay = modeledRec.discharge_date ? 4 : null;

        // NEWS2 score
        let score = 0;
        const sys = parseInt(modeledRec.systolic_bp) || 120;
        const hr = parseInt(modeledRec.heart_rate) || 75;
        const spo2 = parseInt(modeledRec.oxygen_saturation) || 98;
        const temp = parseFloat(modeledRec.temperature_f) || 98.6;

        if (sys <= 90 || sys >= 220) score += 3;
        else if (sys >= 91 && sys <= 100) score += 2;
        else if (sys >= 101 && sys <= 110) score += 1;

        if (hr <= 40 || hr >= 131) score += 3;
        else if (hr >= 41 && hr <= 50) score += 1;
        else if (hr >= 91 && hr <= 110) score += 1;
        else if (hr >= 111 && hr <= 130) score += 2;

        if (spo2 <= 91) score += 3;
        else if (spo2 >= 92 && spo2 <= 93) score += 2;
        else if (spo2 >= 94 && spo2 <= 95) score += 1;

        if (temp <= 95.0 || temp >= 102.4) score += 3;
        else if ((temp >= 95.1 && temp <= 96.8) || (temp >= 100.5 && temp <= 102.3)) score += 1;

        modeledRec.news2_score = score;
        modeledRec.deterioration_risk = score >= 5 ? "HIGH" : score >= 3 ? "MEDIUM" : "LOW";

        let readmitProb = 15;
        if (modeledRec.med_adherence_pct < 70) readmitProb += 35;
        if (modeledRec.age >= 65) readmitProb += 15;
        modeledRec.readmission_probability = Math.min(readmitProb, 100);
        modeledRec.readmission_risk_tier = readmitProb >= 60 ? "HIGH" : readmitProb >= 30 ? "MEDIUM" : "LOW";
        
        modeledRec.clinical_notes = [
          { author: "Dr. Stephen Strange", time: "2 days ago", content: "Patient reports feeling stable. Continue active surveillance check protocols." }
        ];
        modeledRec.medications = [
          { name: "Atorvastatin (Lipitor)", dose: "20mg", time: "Daily at Bedtime", key: "atorvastatin" },
          { name: "Metoprolol Succinate (Lopressor)", dose: "50mg", time: "Daily - 08:00 AM", key: "metoprolol" },
          { name: "Lisinopril (Zestril)", dose: "10mg", time: "Daily - 08:00 AM", key: "lisinopril" }
        ];
        modeledRec.chat_logs = [
          { sender: "doctor", time: "Yesterday, 2:15 PM", content: "Hi John, make sure you take your Metoprolol every morning at 8:00 AM." },
          { sender: "patient", time: "Yesterday, 2:40 PM", content: "Yes doctor, I checked it off on my portal list. Thank you." }
        ];
        modeledRec.hasSymptomAlert = false;
        modeledRec.symptomDetails = "";

        return modeledRec;
      });

      // Inject standard patient John Doe at the top
      const johnExists = modeled.some(p => p.patient_id === "PT-10001");
      if (!johnExists) {
        const john = {
          patient_id: "PT-10001",
          first_name: "John",
          last_name: "Doe",
          date_of_birth: "1981-05-15",
          gender: "Male",
          admission_date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          discharge_date: "",
          department: "Cardiology",
          attending_doctor: "Dr. Stephen Strange",
          primary_diagnosis: "Heart Failure",
          systolic_bp: 120,
          diastolic_bp: 80,
          heart_rate: 72,
          oxygen_saturation: 98,
          temperature_f: 98.6,
          med_adherence_pct: 85,
          readmission_flag: "False",
          age: 45,
          age_group: "Adult (18-64)",
          length_of_stay: null,
          news2_score: 0,
          deterioration_risk: "LOW",
          readmission_probability: 25,
          readmission_risk_tier: "LOW",
          clinical_notes: [
            { author: "Dr. Stephen Strange", time: "2 days ago", content: "Patient admitted for mild dyspnea and edema. Initialized ACE inhibitors and diuretics." }
          ],
          medications: [
            { name: "Atorvastatin (Lipitor)", dose: "20mg", time: "Daily at Bedtime", key: "atorvastatin" },
            { name: "Metoprolol Succinate (Lopressor)", dose: "50mg", time: "Daily - 08:00 AM", key: "metoprolol" },
            { name: "Lisinopril (Zestril)", dose: "10mg", time: "Daily - 08:00 AM", key: "lisinopril" }
          ],
          chat_logs: [
            { sender: "doctor", time: "Yesterday, 2:15 PM", content: "Hi John, make sure you take your Metoprolol every morning at 8:00 AM." },
            { sender: "patient", time: "Yesterday, 2:40 PM", content: "Yes doctor, I checked it off on my portal list. Thank you." }
          ],
          hasSymptomAlert: false,
          symptomDetails: ""
        };
        modeled.unshift(john);
      }

      setRawRecords(parsed);
      setCleanedRecords(cleaned);
      setModeledRecords(modeled);
      setOriginalRecordsCount(parsed.length);
    } catch (e) {
      console.error("Mock database load failure", e);
    }
  };

  // Enforce HSL themes on body element
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("pulseflow-theme", theme);
  }, [theme]);

  // Session activity watcher hooks
  useEffect(() => {
    if (!userRole) {
      clearSessionTimers();
      return;
    }

    const updateActivity = () => {
      lastActiveTime.current = Date.now();
      setShowIdleWarning(false);
      resetSessionTimers();
    };

    window.addEventListener("mousemove", updateActivity);
    window.addEventListener("keydown", updateActivity);
    window.addEventListener("click", updateActivity);
    window.addEventListener("scroll", updateActivity);

    resetSessionTimers();

    return () => {
      window.removeEventListener("mousemove", updateActivity);
      window.removeEventListener("keydown", updateActivity);
      window.removeEventListener("click", updateActivity);
      window.removeEventListener("scroll", updateActivity);
      clearSessionTimers();
    };
  }, [userRole]);

  const resetSessionTimers = () => {
    clearSessionTimers();
    // 10 minutes warning (600,000 ms)
    warnTimerRef.current = setTimeout(() => {
      setShowIdleWarning(true);
    }, 600000); 

    // 15 minutes logout (900,000 ms)
    logoutTimerRef.current = setTimeout(() => {
      handleLogout("Session expired due to inactivity.");
    }, 900000);
  };

  const clearSessionTimers = () => {
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
  };

  const handleLoginSuccess = (role, name, email) => {
    setUserRole(role);
    setUserName(name);
    setUserEmail(email || "");
    
    if (role === "patient") {
      const patientEmail = email ? email.toLowerCase() : "patient@pulseflow.com";
      // Try to find matching patient
      let matchedPatient = modeledRecords.find(p => (p.email && p.email.toLowerCase() === patientEmail) || p.patient_id === "PT-10001");
      
      // If signed up as new patient, dynamically generate custom record
      if (!matchedPatient && patientEmail !== "patient@pulseflow.com") {
        const newId = `PT-${Math.floor(10000 + Math.random() * 90000)}`;
        matchedPatient = {
          patient_id: newId,
          first_name: name.split(" ")[0] || "Patient",
          last_name: name.split(" ").slice(1).join(" ") || "Account",
          email: patientEmail,
          date_of_birth: "1991-08-20",
          gender: "Male",
          admission_date: new Date().toISOString().split('T')[0],
          discharge_date: "",
          department: "Emergency",
          attending_doctor: "Dr. Stephen Strange",
          primary_diagnosis: "Stable Observational Care",
          systolic_bp: 120,
          diastolic_bp: 80,
          heart_rate: 70,
          oxygen_saturation: 98,
          temperature_f: 98.6,
          med_adherence_pct: 100,
          readmission_flag: "False",
          age: 34,
          age_group: "Adult (18-64)",
          length_of_stay: null,
          news2_score: 0,
          deterioration_risk: "LOW",
          readmission_probability: 10,
          readmission_risk_tier: "LOW",
          clinical_notes: [
            { author: "Dr. Stephen Strange", time: "Today", content: "Self-registered patient. Welcome to PulseFlow care management portal." }
          ],
          medications: [
            { name: "Atorvastatin (Lipitor)", dose: "10mg", time: "Daily at Bedtime", key: "atorvastatin" },
            { name: "Metoprolol Succinate (Lopressor)", dose: "25mg", time: "Daily - 08:00 AM", key: "metoprolol" }
          ],
          chat_logs: [
            { sender: "doctor", time: "Today", content: "Welcome! Feel free to log your daily symptoms and message me with questions." }
          ],
          hasSymptomAlert: false,
          symptomDetails: ""
        };
        setModeledRecords(prev => [matchedPatient, ...prev]);
      }
      
      setLoggedPatientId(matchedPatient ? matchedPatient.patient_id : "PT-10001");
      setActiveTab("dashboard");
      setCurrentStep(4);
    } else {
      if (modeledRecords.length > 0) {
        setCurrentStep(4);
        setActiveTab("dashboard");
      } else {
        setCurrentStep(1);
        setActiveTab("upload");
      }
    }
  };

  const handleLogout = (msg = "") => {
    setUserRole(null);
    setUserName("");
    setUserEmail("");
    setShowIdleWarning(false);
    clearSessionTimers();
    if (msg) alert(msg);
  };

  const handleIngestionComplete = (count, formattedData, mapping, mode) => {
    setOriginalRecordsCount(count);
    if (mode === "append" && cleanedRecords.length > 0) {
      setRawRecords(prev => [...prev, ...formattedData]);
    } else {
      setRawRecords(formattedData);
    }
    setCurrentStep(2);
    setActiveTab("clean");
  };

  const handleCleaningComplete = (cleanedData) => {
    setCleanedRecords(cleanedData);
    setCurrentStep(3);
    setActiveTab("model");
  };

  const handleModelingComplete = (modeledData) => {
    setModeledRecords(modeledData);
    setCurrentStep(4);
    setActiveTab("dashboard");
  };

  // Attending doctor notes logger update handler
  const handleUpdateNotes = (patientId, updatedNotes) => {
    setModeledRecords(prev =>
      prev.map(p => (p.patient_id === patientId ? { ...p, clinical_notes: updatedNotes } : p))
    );
  };

  // Medication compliance update from patient portal
  const handleUpdatePatientMedAdherence = (patientId, newPercentage) => {
    setModeledRecords(prev =>
      prev.map(p => (p.patient_id === patientId ? { ...p, med_adherence_pct: newPercentage } : p))
    );
  };

  // Symptom logging warnings callback
  const handleLogPatientSymptomAlert = (patientId, severity, details) => {
    setModeledRecords(prev =>
      prev.map(p => (p.patient_id === patientId ? { 
        ...p, 
        hasSymptomAlert: severity === "HIGH", 
        symptomDetails: details
      } : p))
    );
  };

  // Prescribe medication callback from doctor profile
  const handlePrescribeMedication = (patientId, newMed) => {
    setModeledRecords(prev =>
      prev.map(p => {
        if (p.patient_id === patientId) {
          const updatedMeds = [...(p.medications || []), {
            name: newMed.name,
            dose: newMed.dose,
            time: newMed.time,
            key: newMed.name.toLowerCase().replace(/[^a-z0-9]/g, "")
          }];
          return { ...p, medications: updatedMeds };
        }
        return p;
      })
    );
  };

  // Authorize discharge callback from doctor profile
  const handleAuthorizeDischarge = (patientId) => {
    setModeledRecords(prev =>
      prev.map(p => {
        if (p.patient_id === patientId) {
          return { 
            ...p, 
            discharge_date: new Date().toISOString().split('T')[0]
          };
        }
        return p;
      })
    );
  };

  // Chat messaging callback
  const handleSendMessage = (patientId, updatedChatLogs) => {
    setModeledRecords(prev =>
      prev.map(p => (p.patient_id === patientId ? { ...p, chat_logs: updatedChatLogs } : p))
    );
  };

  const handleResetDatabase = () => {
    if (window.confirm("Are you sure you want to clear the active patient database? This will reset the workflow.")) {
      setRawRecords([]);
      setCleanedRecords([]);
      setModeledRecords([]);
      setComparisonList([]);
      setCurrentStep(1);
      setActiveTab("upload");
    }
  };

  const handleAddToCompare = (patientId) => {
    if (comparisonList.length >= 3) {
      alert("You can compare a maximum of 3 patients side-by-side.");
      return;
    }
    setComparisonList(prev => [...prev, patientId]);
  };

  const handleRemoveFromCompare = (patientId) => {
    setComparisonList(prev => prev.filter(id => id !== patientId));
  };

  // UI layout routers
  const renderTabContent = () => {
    switch (activeTab) {
      case "upload":
        return (
          <DataIngestion
            onIngestionComplete={handleIngestionComplete}
            onResetStepper={handleResetDatabase}
          />
        );
      case "clean":
        return (
          <DataCleaning
            rawRecords={rawRecords}
            onCleaningComplete={handleCleaningComplete}
          />
        );
      case "model":
        return (
          <ClinicalModeling
            cleanedRecords={cleanedRecords}
            onModelingComplete={handleModelingComplete}
          />
        );
      case "dashboard":
        return (
          <Dashboard
            data={modeledRecords}
            role={userRole}
            vitalsThresholds={vitalsThresholds}
            onOpenProfile={setSelectedPatientId}
            onAddToCompare={handleAddToCompare}
            onRemoveFromCompare={handleRemoveFromCompare}
            comparisonList={comparisonList}
            onOpenComparison={() => setIsComparisonOpen(true)}
          />
        );
      case "exploration":
        return <InsightsPanel data={modeledRecords} />;
      case "settings":
        return (
          <div className="settings-layout">
            <h2>System Configurations & Integration Actions</h2>
            
            {userRole === "admin" && (
              <div className="settings-card">
                <h3>Admin Clinical Vitals Thresholds</h3>
                <p className="user-role" style={{ textTransform: "none", fontSize: "0.82rem", marginTop: "4px" }}>
                  Adjust trigger limits for active bedside vitals alerts on the live dashboard.
                </p>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "16px" }}>
                  <div className="form-group">
                    <label style={{ fontSize: "0.78rem" }}>Systolic BP Max (mmHg)</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      value={vitalsThresholds.sysMax} 
                      onChange={(e) => setVitalsThresholds(prev => ({ ...prev, sysMax: parseInt(e.target.value) || 175 }))}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: "0.78rem" }}>Systolic BP Min (mmHg)</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      value={vitalsThresholds.sysMin} 
                      onChange={(e) => setVitalsThresholds(prev => ({ ...prev, sysMin: parseInt(e.target.value) || 90 }))}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: "0.78rem" }}>Min Oxygen Saturation SpO2 (%)</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      value={vitalsThresholds.spo2Min} 
                      onChange={(e) => setVitalsThresholds(prev => ({ ...prev, spo2Min: parseInt(e.target.value) || 92 }))}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: "0.78rem" }}>Max Heart Rate (bpm)</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      value={vitalsThresholds.hrMax} 
                      onChange={(e) => setVitalsThresholds(prev => ({ ...prev, hrMax: parseInt(e.target.value) || 120 }))}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="settings-card">
              <h3>Display Customizations</h3>
              <p className="user-role" style={{ textTransform: "none", fontSize: "0.82rem", marginTop: "4px" }}>
                Select visual parameters and color themes for medical workspaces.
              </p>
              <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                <button className={`btn-secondary ${theme === "light" ? "active" : ""}`} onClick={() => setTheme("light")}>
                  <Sun size={16} /> Light Theme
                </button>
                <button className={`btn-secondary ${theme === "dark" ? "active" : ""}`} onClick={() => setTheme("dark")}>
                  <Moon size={16} /> Dark Theme
                </button>
              </div>
            </div>

            {userRole === "admin" && (
              <div className="settings-card" style={{ borderColor: "var(--color-danger)" }}>
                <h3 style={{ color: "var(--color-danger)" }}>Danger Zone</h3>
                <p className="user-role" style={{ textTransform: "none", fontSize: "0.82rem", marginTop: "4px" }}>
                  Resetting the database clears active files from memory state.
                </p>
                <div style={{ marginTop: "12px" }}>
                  <button className="logout-btn" onClick={handleResetDatabase}>
                    Purge Active Patient Records
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      default:
        return <div>View not found</div>;
    }
  };

  // If not logged in, render Login Page
  if (!userRole) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Patient Dashboard bypass layout
  if (userRole === "patient") {
    const activePatient = modeledRecords.find(p => p.patient_id === loggedPatientId) || modeledRecords[0];
    return (
      <PatientPortal 
        patient={activePatient}
        onUpdateAdherence={handleUpdatePatientMedAdherence}
        onLogSymptomAlert={handleLogPatientSymptomAlert}
        onSendMessage={handleSendMessage}
        onLogout={handleLogout}
        theme={theme}
        setTheme={setTheme}
      />
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div>
          <div className="logo-container">
            <div className="logo-icon">
              <Heart size={24} fill="var(--color-primary)" />
            </div>
            <span className="logo-text">PulseFlow</span>
          </div>

          <ul className="nav-list">
            {/* Step-locked tabs - Admin and Analyst only can ingest/clean/model */}
            {(userRole === "admin" || userRole === "analyst") && (
              <>
                <li className={`nav-item ${activeTab === "upload" ? "active" : ""}`}>
                  <button onClick={() => activeTab !== "upload" && currentStep >= 1 && setActiveTab("upload")}>
                    <Upload size={18} /> Ingest raw files
                  </button>
                </li>
                
                <li className={`nav-item ${activeTab === "clean" ? "active" : ""} ${currentStep < 2 ? "disabled" : ""}`}>
                  <button
                    onClick={() => currentStep >= 2 && setActiveTab("clean")}
                    disabled={currentStep < 2}
                  >
                    <FileSpreadsheet size={18} /> Clean & verify
                  </button>
                </li>

                <li className={`nav-item ${activeTab === "model" ? "active" : ""} ${currentStep < 3 ? "disabled" : ""}`}>
                  <button
                    onClick={() => currentStep >= 3 && setActiveTab("model")}
                    disabled={currentStep < 3}
                  >
                    <Sliders size={18} /> Run modeling
                  </button>
                </li>
              </>
            )}

            {/* Dashboard and insights tab (Available to Admin, Doctor, Analyst) */}
            <li className={`nav-item ${activeTab === "dashboard" ? "active" : ""} ${currentStep < 4 ? "disabled" : ""}`}>
              <button
                onClick={() => currentStep >= 4 && setActiveTab("dashboard")}
                disabled={currentStep < 4}
              >
                <LayoutDashboard size={18} /> Live Dashboard
              </button>
            </li>

            <li className={`nav-item ${activeTab === "exploration" ? "active" : ""} ${currentStep < 4 ? "disabled" : ""}`}>
              <button
                onClick={() => currentStep >= 4 && setActiveTab("exploration")}
                disabled={currentStep < 4}
              >
                <Lightbulb size={18} /> Insights board
              </button>
            </li>
          </ul>
        </div>

        <div className="sidebar-footer">
          {/* Settings tab (Admin has full configs, others have basic display customizers) */}
          <div className={`nav-item ${activeTab === "settings" ? "active" : ""}`} style={{ listStyle: "none" }}>
            <button onClick={() => setActiveTab("settings")} style={{ padding: "8px 12px" }}>
              <Sliders size={16} /> {userRole === "admin" ? "Admin Settings" : "Display Settings"}
            </button>
          </div>

          <div className="user-badge">
            <div className="user-avatar">
              {userName.split(" ").pop().charAt(0)}
            </div>
            <div className="user-details">
              <span className="user-name">{userName}</span>
              <span className="user-role">{userRole}</span>
            </div>
          </div>
          
          <button className="logout-btn" onClick={() => handleLogout()}>
            <LogOut size={16} /> Exit Session
          </button>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <main className="main-workspace">
        <header className="header-bar">
          <div className="header-title-area">
            <ShieldCheck size={20} style={{ color: "var(--color-secondary)" }} />
            <h3 style={{ fontSize: "1.1rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {activeTab === "upload" && "Data Ingestion Portal"}
              {activeTab === "clean" && "Verification & Cleaning"}
              {activeTab === "model" && "Predictive Scoring Models"}
              {activeTab === "dashboard" && `${userRole.toUpperCase()} Clinical Dashboard`}
              {activeTab === "exploration" && "Data Exploration Insights"}
              {activeTab === "settings" && "System Settings"}
            </h3>
          </div>

          <div className="header-controls">
            <button className="theme-toggle-btn" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: "500" }}>
              {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>
        </header>

        {/* Dynamic Stepper Bar (Only show if dashboard is locked) */}
        <div className="workspace-content">
          {currentStep < 4 && (
            <div className="stepper-container">
              <div className={`stepper-step ${currentStep >= 1 ? "active" : ""} ${currentStep > 1 ? "completed" : ""}`}>
                <div className="step-number">1</div>
                <span className="step-label">Ingest CSV</span>
              </div>
              <div className={`stepper-line ${currentStep > 1 ? "active" : ""}`}></div>
              <div className={`stepper-step ${currentStep >= 2 ? "active" : ""} ${currentStep > 2 ? "completed" : ""}`}>
                <div className="step-number">2</div>
                <span className="step-label">Data Cleaning</span>
              </div>
              <div className={`stepper-line ${currentStep > 2 ? "active" : ""}`}></div>
              <div className={`stepper-step ${currentStep >= 3 ? "active" : ""} ${currentStep > 3 ? "completed" : ""}`}>
                <div className="step-number">3</div>
                <span className="step-label">Clinical Engine</span>
              </div>
              <div className={`stepper-line ${currentStep > 3 ? "active" : ""}`}></div>
              <div className={`stepper-step ${currentStep >= 4 ? "active" : ""}`}>
                <div className="step-number">4</div>
                <span className="step-label">Dashboard</span>
              </div>
            </div>
          )}

          {renderTabContent()}
        </div>
      </main>

      {/* Patient Profile Modal Popup */}
      {selectedPatientId && (
        <PatientProfile
          patientId={selectedPatientId}
          data={modeledRecords}
          role={userRole}
          onClose={() => setSelectedPatientId(null)}
          onUpdateNotes={handleUpdateNotes}
          onPrescribeMedication={handlePrescribeMedication}
          onAuthorizeDischarge={handleAuthorizeDischarge}
          onSendMessage={handleSendMessage}
        />
      )}

      {/* Patient Comparative Slide-up Drawer */}
      <PatientComparison
        comparisonList={comparisonList}
        data={modeledRecords}
        role={userRole}
        onClose={() => setIsComparisonOpen(false)}
        onRemovePatient={handleRemoveFromCompare}
      />

      {/* Inactivity Warning Dialog Overlay */}
      {showIdleWarning && (
        <div className="modal-overlay" style={{ zIndex: 110 }}>
          <div className="login-card" style={{ width: "380px", textAlign: "center", gap: "16px", padding: "30px" }}>
            <AlertCircle size={44} style={{ color: "var(--color-warning)", margin: "0 auto" }} />
            <h3>Idle Session Notice</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              We detected no action in the last 10 minutes. You will be logged out automatically in 5 minutes to safeguard patient data.
            </p>
            <button className="btn-primary" onClick={() => setShowIdleWarning(false)} style={{ width: "100%" }}>
              Stay Authenticated
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
