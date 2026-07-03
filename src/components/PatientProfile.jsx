import React, { useState, useMemo } from "react";
import { Line } from "react-chartjs-2";
import { X, Heart, ShieldAlert, CheckCircle, Activity, FileText, Pill, Send, MessageSquare } from "lucide-react";

export default function PatientProfile({ 
  patientId, 
  data, 
  role, 
  onClose, 
  onUpdateNotes,
  onPrescribeMedication,
  onAuthorizeDischarge,
  onSendMessage
}) {
  const [activeTab, setActiveTab] = useState("clinical");
  const [newNote, setNewNote] = useState("");
  const [doctorChatReply, setDoctorChatReply] = useState("");

  // Prescription form states
  const [newMedName, setNewMedName] = useState("");
  const [newMedDose, setNewMedDose] = useState("");
  const [newMedTime, setNewMedTime] = useState("");

  const patient = useMemo(() => {
    return data.find((r) => r.patient_id === patientId);
  }, [data, patientId]);

  // Simulate longitudinal vitals data based on current readings
  const longitudinalVitalsData = useMemo(() => {
    if (!patient) return null;
    const baseSys = parseInt(patient.systolic_bp) || 120;
    const baseDia = parseInt(patient.diastolic_bp) || 80;
    const baseHr = parseInt(patient.heart_rate) || 75;
    const baseSpo2 = parseInt(patient.oxygen_saturation) || 98;

    const labels = ["08:00", "12:00", "16:00", "20:00", "00:00", "04:00 (Attending)"];
    
    const sysSeries = [baseSys - 8, baseSys - 2, baseSys + 4, baseSys - 4, baseSys + 2, baseSys];
    const diaSeries = [baseDia - 4, baseDia + 2, baseDia + 6, baseDia - 2, baseDia - 4, baseDia];
    const hrSeries = [baseHr + 10, baseHr + 4, baseHr - 2, baseHr + 6, baseHr + 2, baseHr];
    const spo2Series = [baseSpo2, baseSpo2 - 1, baseSpo2, baseSpo2 - 2, baseSpo2 - 1, baseSpo2];

    return {
      labels,
      datasets: [
        {
          label: "Systolic BP",
          data: sysSeries,
          borderColor: "hsl(205, 90%, 43%)",
          backgroundColor: "rgba(205, 90%, 43%, 0.1)",
          yAxisID: "y"
        },
        {
          label: "Diastolic BP",
          data: diaSeries,
          borderColor: "hsl(175, 75%, 38%)",
          backgroundColor: "rgba(175, 75%, 38%, 0.1)",
          yAxisID: "y"
        },
        {
          label: "Heart Rate",
          data: hrSeries,
          borderColor: "hsl(38, 92%, 48%)",
          backgroundColor: "transparent",
          yAxisID: "y1"
        },
        {
          label: "Oxygen Saturation SpO2 (%)",
          data: spo2Series,
          borderColor: "hsl(354, 75%, 52%)",
          backgroundColor: "transparent",
          yAxisID: "y2"
        }
      ]
    };
  }, [patient]);

  if (!patient) return null;

  // Mask PII if analyst
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

  const handleAddNote = (e) => {
    e.preventDefault();
    if (newNote.trim() === "") return;
    
    const timestamp = new Date().toLocaleString();
    const formattedNote = {
      author: role === "doctor" ? "Dr. Stephen Strange" : "Administrator",
      time: timestamp,
      content: newNote.trim()
    };
    
    const updatedNotes = [...(patient.clinical_notes || []), formattedNote];
    onUpdateNotes(patient.patient_id, updatedNotes);
    setNewNote("");
  };

  const handlePrescribeSubmit = (e) => {
    e.preventDefault();
    if (newMedName.trim() === "" || newMedDose.trim() === "") return;
    
    onPrescribeMedication(patient.patient_id, {
      name: newMedName.trim(),
      dose: newMedDose.trim(),
      time: newMedTime.trim() || "Daily - 08:00 AM"
    });

    setNewMedName("");
    setNewMedDose("");
    setNewMedTime("");
  };

  const handleDischargeClick = () => {
    if (window.confirm(`Are you sure you want to authorize discharge for patient ${patient.first_name} ${patient.last_name}?`)) {
      onAuthorizeDischarge(patient.patient_id);
    }
  };

  const handleSendDoctorReply = (e) => {
    e.preventDefault();
    if (doctorChatReply.trim() === "") return;

    const timeStr = new Date().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    const replyMsg = {
      sender: "doctor",
      time: "Today, " + timeStr,
      content: doctorChatReply.trim()
    };

    const updatedLogs = [...(patient.chat_logs || []), replyMsg];
    onSendMessage(patient.patient_id, updatedLogs);
    setDoctorChatReply("");
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "880px" }}>
        {/* Modal Header */}
        <div className="profile-modal-header">
          <div className="profile-header-meta">
            <div className="profile-avatar">
              {patient.first_name.charAt(0)}
              {patient.last_name.charAt(0)}
            </div>
            <div className="profile-name-title">
              <h2>{maskText(`${patient.first_name} ${patient.last_name}`, "name")}</h2>
              <div className="profile-vitals-quick">
                <span className="user-role" style={{ textTransform: "none", fontSize: "0.78rem" }}>
                  MRN ID: <strong>{maskText(patient.patient_id, "id")}</strong>
                </span>
                <span className="profile-vital-badge">
                  <Activity size={12} style={{ color: "var(--color-primary)" }} /> {patient.department}
                </span>
                <span className="profile-vital-badge">
                  Age: {patient.age} yrs ({patient.gender})
                </span>
              </div>
            </div>
          </div>
          <button className="profile-close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Dynamic Symptom Alert banner on doctor profile */}
        {patient.hasSymptomAlert && role !== "analyst" && (
          <div className="custom-alert-banner danger" style={{ margin: "0 24px 16px 24px", padding: "12px 16px" }}>
            <ShieldAlert size={20} />
            <div className="alert-banner-content">
              <h4 style={{ fontSize: "0.85rem", fontWeight: "700" }}>Active Patient-Logged Symptom Alert</h4>
              <p style={{ fontSize: "0.78rem" }}>{patient.symptomDetails}</p>
            </div>
          </div>
        )}

        {/* Tabs Bar */}
        <div className="profile-tabs-strip">
          <button
            className={`profile-tab-button ${activeTab === "clinical" ? "active" : ""}`}
            onClick={() => setActiveTab("clinical")}
          >
            Clinical Chart & Vitals
          </button>
          <button
            className={`profile-tab-button ${activeTab === "medications" ? "active" : ""}`}
            onClick={() => setActiveTab("medications")}
          >
            Medication Registry
          </button>
          <button
            className={`profile-tab-button ${activeTab === "notes" ? "active" : ""}`}
            onClick={() => setActiveTab("notes")}
          >
            Attending Notes ({patient.clinical_notes?.length || 0})
          </button>
          <button
            className={`profile-tab-button ${activeTab === "messages" ? "active" : ""}`}
            onClick={() => setActiveTab("messages")}
          >
            Patient Chat ({patient.chat_logs?.length || 0})
          </button>
        </div>

        {/* Tab Body Contents */}
        <div className="profile-body-content" style={{ maxHeight: "480px", overflowY: "auto" }}>
          {activeTab === "clinical" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* Detailed Demographics */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", backgroundColor: "var(--bg-primary)", padding: "16px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
                <div>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: "600" }}>ADMIT DATE</span>
                  <p style={{ fontSize: "0.85rem", fontWeight: "600" }}>{patient.admission_date}</p>
                </div>
                <div>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: "600" }}>DISCHARGE DATE</span>
                  <p style={{ fontSize: "0.85rem", fontWeight: "600" }}>
                    {patient.discharge_date ? (
                      <span style={{ color: "var(--color-success)" }}>{patient.discharge_date} (Discharged)</span>
                    ) : (
                      <span style={{ color: "var(--color-primary)" }}>Active Beds Assignment</span>
                    )}
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: "600" }}>ATTENDING DOCTOR</span>
                  <p style={{ fontSize: "0.85rem", fontWeight: "600" }}>{patient.attending_doctor}</p>
                </div>
                <div>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: "600" }}>PRIMARY DIAGNOSIS</span>
                  <p style={{ fontSize: "0.85rem", fontWeight: "600" }}>{patient.primary_diagnosis}</p>
                </div>
              </div>

              {/* Vitals Ribbon */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px" }}>
                <div style={{ padding: "12px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", textAlign: "center", backgroundColor: "var(--bg-primary)" }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>BP Systolic</span>
                  <p style={{ fontSize: "1.1rem", fontWeight: "700", marginTop: "4px" }}>{patient.systolic_bp} <span style={{ fontSize: "0.75rem", fontWeight: "500" }}>mmHg</span></p>
                </div>
                <div style={{ padding: "12px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", textAlign: "center", backgroundColor: "var(--bg-primary)" }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>BP Diastolic</span>
                  <p style={{ fontSize: "1.1rem", fontWeight: "700", marginTop: "4px" }}>{patient.diastolic_bp} <span style={{ fontSize: "0.75rem", fontWeight: "500" }}>mmHg</span></p>
                </div>
                <div style={{ padding: "12px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", textAlign: "center", backgroundColor: "var(--bg-primary)" }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Heart Rate</span>
                  <p style={{ fontSize: "1.1rem", fontWeight: "700", marginTop: "4px" }}>{patient.heart_rate} <span style={{ fontSize: "0.75rem", fontWeight: "500" }}>bpm</span></p>
                </div>
                <div style={{ padding: "12px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", textAlign: "center", borderColor: parseInt(patient.oxygen_saturation) < 92 ? "var(--color-danger)" : "var(--border-color)", backgroundColor: "var(--bg-primary)" }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Oxygen sat. SpO2</span>
                  <p style={{ fontSize: "1.1rem", fontWeight: "700", marginTop: "4px", color: parseInt(patient.oxygen_saturation) < 92 ? "var(--color-danger)" : "var(--text-main)" }}>{patient.oxygen_saturation}%</p>
                </div>
                <div style={{ padding: "12px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", textAlign: "center", backgroundColor: "var(--bg-primary)" }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Temperature</span>
                  <p style={{ fontSize: "1.1rem", fontWeight: "700", marginTop: "4px" }}>{patient.temperature_f}°F</p>
                </div>
              </div>

              {/* Vitals Longitudinal Graph */}
              <div style={{ height: "180px" }}>
                <h4 style={{ fontSize: "0.85rem", marginBottom: "8px", color: "var(--text-muted)" }}>24-Hour Longitudinal Vitals Timeline</h4>
                <div style={{ height: "150px" }}>
                  <Line
                    data={longitudinalVitalsData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: {
                        y: { position: "left", grid: { color: "var(--border-color)" }, ticks: { font: { size: 9 } } },
                        y1: { position: "right", grid: { display: false }, ticks: { font: { size: 9 } } },
                        y2: { display: false },
                        x: { grid: { display: false }, ticks: { font: { size: 9 } } }
                      }
                    }}
                  />
                </div>
              </div>

              {/* Doctor Quick Actions Control Bar */}
              {(role === "doctor" || role === "admin") && (
                <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "16px", display: "flex", justifyContent: "flex-end" }}>
                  {!patient.discharge_date ? (
                    <button className="logout-btn" onClick={handleDischargeClick} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      Authorize Inpatient Discharge
                    </button>
                  ) : (
                    <div style={{ color: "var(--color-success)", display: "flex", alignItems: "center", gap: "6px", fontWeight: "600", fontSize: "0.88rem" }}>
                      <CheckCircle size={16} /> Discharge completed on {patient.discharge_date}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "medications" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div className="custom-alert-banner success" style={{ padding: "12px 16px", margin: 0 }}>
                <Pill size={18} />
                <div className="alert-banner-content">
                  <h4 style={{ fontSize: "0.88rem" }}>Medication Adherence Compliance Index: {patient.med_adherence_pct}%</h4>
                  <p style={{ fontSize: "0.78rem" }}>Current adherence rate logged by patient's daily checklist inputs.</p>
                </div>
              </div>

              {/* Medication registry list */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {(patient.medications || []).map((med, idx) => (
                  <div key={idx} className="flex-row-between" style={{ padding: "14px 18px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", backgroundColor: "var(--bg-primary)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <Pill size={16} style={{ color: "var(--color-primary)" }} />
                      <div>
                        <strong style={{ fontSize: "0.88rem" }}>{med.name}</strong>
                        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Dosage: {med.dose} | Frequency: {med.time}</p>
                      </div>
                    </div>
                    <div>
                      <span className="risk-badge" style={{ backgroundColor: "var(--color-success-soft)", color: "var(--color-success)" }}>
                        Registered
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Prescribe Medication Form (Doctor/Admin only) */}
              {(role === "doctor" || role === "admin") && (
                <div className="table-card" style={{ padding: "20px", border: "1px dashed var(--color-primary)" }}>
                  <h4 style={{ fontSize: "0.88rem", marginBottom: "12px", color: "var(--color-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Pill size={16} /> Prescribe New Clinical Medication
                  </h4>
                  <form onSubmit={handlePrescribeSubmit} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: "12px", alignItems: "end" }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: "0.75rem" }}>Medication Name</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        placeholder="e.g. Coreg (Carvedilol)"
                        value={newMedName} 
                        onChange={(e) => setNewMedName(e.target.value)} 
                        required 
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: "0.75rem" }}>Dosage</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        placeholder="e.g. 12.5mg"
                        value={newMedDose} 
                        onChange={(e) => setNewMedDose(e.target.value)} 
                        required 
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: "0.75rem" }}>Frequency</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        placeholder="e.g. Twice Daily"
                        value={newMedTime} 
                        onChange={(e) => setNewMedTime(e.target.value)} 
                      />
                    </div>
                    <button type="submit" className="btn-primary" style={{ height: "40px" }}>
                      Prescribe
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {activeTab === "notes" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {role === "analyst" ? (
                <div className="custom-alert-banner danger">
                  <ShieldAlert size={20} />
                  <div className="alert-banner-content">
                    <h4>Clinical Narrative Notes Restricted</h4>
                    <p>Under your current context (Analyst), you do not have authorization to access raw progress reports or narrative patient records.</p>
                  </div>
                </div>
              ) : (
                <>
                  <form onSubmit={handleAddNote} style={{ display: "flex", gap: "12px" }}>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Type clinical progress notes, vitals review, discharge checklists..."
                      required
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                    />
                    <button type="submit" className="btn-primary" style={{ flexShrink: 0 }}>
                      Add Progress Note
                    </button>
                  </form>

                  <div className="notes-log-list">
                    {patient.clinical_notes && patient.clinical_notes.length > 0 ? (
                      patient.clinical_notes.map((note, idx) => (
                        <div key={idx} className="note-log-item">
                          <div className="note-log-header">
                            <span style={{ fontWeight: "700" }}>{note.author}</span>
                            <span>{note.time}</span>
                          </div>
                          <p style={{ fontSize: "0.85rem", whiteSpace: "pre-line" }}>{note.content}</p>
                        </div>
                      ))
                    ) : (
                      <div className="empty-state-container" style={{ padding: "32px" }}>
                        <FileText size={32} style={{ color: "var(--text-muted)" }} />
                        <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                          No clinical progress notes entered. Type in the input box above to add notes.
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === "messages" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {role === "analyst" ? (
                <div className="custom-alert-banner danger">
                  <ShieldAlert size={20} />
                  <div className="alert-banner-content">
                    <h4>Secure Communication Logs Restricted</h4>
                    <p>Analysts are blocked from viewing confidential patient-doctor chat correspondence.</p>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ maxHeight: "250px", overflowY: "auto", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", padding: "16px", backgroundColor: "var(--bg-primary)", display: "flex", flexDirection: "column", gap: "12px" }}>
                    {patient.chat_logs && patient.chat_logs.length > 0 ? (
                      patient.chat_logs.map((msg, idx) => (
                        <div key={idx} style={{ 
                          alignSelf: msg.sender === "doctor" ? "flex-end" : "flex-start",
                          maxWidth: "80%",
                          textAlign: msg.sender === "doctor" ? "right" : "left"
                        }}>
                          <div style={{ 
                            padding: "8px 12px", 
                            borderRadius: "var(--radius-md)", 
                            backgroundColor: msg.sender === "doctor" ? "var(--color-primary-soft)" : "var(--bg-primary)",
                            border: "1px solid var(--border-color)",
                            fontSize: "0.82rem",
                            display: "inline-block"
                          }}>
                            {msg.content}
                          </div>
                          <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "2px" }}>
                            {msg.sender === "doctor" ? "Me (Dr. Stephen Strange)" : "Patient"} • {msg.time}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", textAlign: "center" }}>No chat correspondence yet.</p>
                    )}
                  </div>

                  <form onSubmit={handleSendDoctorReply} style={{ display: "flex", gap: "12px" }}>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="Type reply to patient..."
                      value={doctorChatReply} 
                      onChange={(e) => setDoctorChatReply(e.target.value)} 
                      required 
                    />
                    <button type="submit" className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Send size={14} /> Send Reply
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
