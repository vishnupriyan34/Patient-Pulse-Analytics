/**
 * Utility to generate a realistic, messy clinical CSV dataset for testing.
 * Contains duplicate rows, empty values, casing inconsistencies, out-of-bounds vitals,
 * and different date formats.
 */

const firstNames = [
  "John", "Sarah", "Michael", "Emily", "Robert", "Elena", "Marcus", "Chloe", "David", "Jessica",
  "James", "Linda", "William", "Elizabeth", "Joseph", "Karen", "Thomas", "Nancy", "Charles", "Lisa",
  "Daniel", "Betty", "Matthew", "Margaret", "Anthony", "Sandra", "Mark", "Ashley", "Donald", "Dorothy"
];

const lastNames = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
  "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
  "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson"
];

const departments = [
  "Cardiology", "Neurology", "Pediatrics", "Oncology", "Emergency", "ICU", "Obstetrics", "Orthopedics"
];

const diagnoses = {
  "Cardiology": ["Heart Failure", "Myocardial Infarction", "Arrhythmia", "Hypertension"],
  "Neurology": ["Stroke", "Transient Ischemic Attack", "Migraine", "Multiple Sclerosis"],
  "Pediatrics": ["Asthma", "Acute Bronchitis", "Otitis Media", "Gastroenteritis"],
  "Oncology": ["Lung Cancer", "Breast Cancer", "Colorectal Cancer", "Leukemia"],
  "Emergency": ["Chest Pain", "Acute Abdomen", "Fracture", "Laceration"],
  "ICU": ["Sepsis", "Respiratory Failure", "Diabetic Ketoacidosis", "Shock"],
  "Obstetrics": ["Pregnancy Supervision", "Hyperemesis Gravidarum", "Preeclampsia"],
  "Orthopedics": ["Osteoarthritis", "Herniated Disc", "Meniscal Tear", "Rheumatoid Arthritis"]
};

const doctors = [
  "Dr. Alice Gregory", "Dr. Robert House", "Dr. Charles Xavier", "Dr. Stephen Strange",
  "Dr. Meredith Grey", "Dr. John Watson", "Dr. Michaela Quinn", "Dr. Leonard McCoy"
];

const genders = ["Male", "Female", "Other"];

// Helper to get random item
const randItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Helper to get random number in range
const randRange = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Helper to format date
const formatDate = (date, formatType) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  
  if (formatType === 0) return `${yyyy}-${mm}-${dd}`; // ISO
  if (formatType === 1) return `${mm}/${dd}/${yyyy}`; // US
  return `${dd}-${mm}-${yyyy}`; // European
};

export const generateMockCSV = (rowCount = 80) => {
  const headers = [
    "patient_id", "first_name", "last_name", "date_of_birth", "gender",
    "admission_date", "discharge_date", "department", "attending_doctor",
    "primary_diagnosis", "systolic_bp", "diastolic_bp", "heart_rate",
    "oxygen_saturation", "temperature_f", "med_adherence_pct", "readmission_flag"
  ];
  
  const rows = [];
  
  // Seed dates relative to today
  const today = new Date();
  
  for (let i = 1; i <= rowCount; i++) {
    const idNum = 10000 + i;
    let patientId = `PT-${idNum}`;
    
    // Injected Error: 5% invalid IDs (lowercase or missing prefix)
    if (Math.random() < 0.05) {
      patientId = Math.random() < 0.5 ? `pt-${idNum}` : `${idNum}`;
    }
    
    const firstName = randItem(firstNames);
    const lastName = randItem(lastNames);
    
    // Date of birth
    const ageYears = randRange(18, 92);
    const dob = new Date();
    dob.setFullYear(today.getFullYear() - ageYears);
    dob.setMonth(randRange(0, 11));
    dob.setDate(randRange(1, 28));
    
    // Inconsistent DOB Date format
    const dobStr = formatDate(dob, randRange(0, 2));
    
    const gender = randItem(genders);
    
    // Admission Date (past 90 days)
    const adDaysAgo = randRange(5, 90);
    const admission = new Date();
    admission.setDate(today.getDate() - adDaysAgo);
    const admissionStr = formatDate(admission, randRange(0, 2));
    
    // Discharge Date (1 to 14 days after admission)
    const stayLength = randRange(1, 14);
    const discharge = new Date(admission);
    discharge.setDate(admission.getDate() + stayLength);
    
    // Injected Error: Some patients are still active (no discharge date)
    let dischargeStr = formatDate(discharge, randRange(0, 2));
    if (Math.random() < 0.20) {
      dischargeStr = ""; // Still admitted
    }
    
    // Attending Department
    let dept = randItem(departments);
    // Injected Error: Mismatched cases & spacing
    if (Math.random() < 0.15) {
      const errorType = randRange(0, 2);
      if (errorType === 0) dept = dept.toUpperCase();
      else if (errorType === 1) dept = dept.toLowerCase();
      else dept = `  ${dept} `;
    }
    
    const doc = randItem(doctors);
    const diag = randItem(diagnoses[dept.trim().charAt(0).toUpperCase() + dept.trim().slice(1).toLowerCase()] || diagnoses["ICU"]);
    
    // Vitals
    let sys = randRange(110, 145);
    let dia = randRange(70, 95);
    let hr = randRange(60, 100);
    let spo2 = randRange(93, 100);
    let temp = (randRange(975, 995) / 10).toFixed(1);
    
    // Injected Error: 8% abnormal clinical values (triggers high risk alerts)
    if (Math.random() < 0.08) {
      const alertType = randRange(0, 3);
      if (alertType === 0) { // Severe Hypertension
        sys = randRange(185, 210);
        dia = randRange(105, 120);
      } else if (alertType === 1) { // Oxygen Desaturation
        spo2 = randRange(85, 91);
      } else if (alertType === 2) { // Severe Fever
        temp = (randRange(1015, 1045) / 10).toFixed(1);
        hr = randRange(110, 135);
      } else { // Bradycardia / Low BP
        hr = randRange(40, 48);
        sys = randRange(85, 95);
      }
    }
    
    // Injected Error: 5% empty vitals cells (to test median imputation)
    if (Math.random() < 0.05) {
      const dropType = randRange(0, 2);
      if (dropType === 0) sys = "";
      if (dropType === 1) spo2 = "";
      if (dropType === 2) temp = "";
    }
    
    // Injected Error: 3% typographic errors in vitals (e.g. text instead of numbers)
    if (Math.random() < 0.03) {
      sys = "120 mmHg";
    }
    
    // Medication Adherence
    let medAdherence = randRange(50, 100);
    // Injected Error: 5% missing adherence values
    let medAdherenceStr = medAdherence.toString();
    if (Math.random() < 0.05) {
      medAdherenceStr = "";
    }
    
    // Readmission flag (mostly for chronic diseases with low med adherence)
    let readmit = "False";
    if (medAdherence < 75 && (diag === "Heart Failure" || diag === "Stroke" || diag === "COPD" || diag === "Sepsis")) {
      readmit = Math.random() < 0.65 ? "True" : "False";
    } else {
      readmit = Math.random() < 0.12 ? "True" : "False";
    }
    
    rows.push([
      patientId, firstName, lastName, dobStr, gender,
      admissionStr, dischargeStr, dept, doc,
      diag, sys, dia, hr, spo2, temp, medAdherenceStr, readmit
    ]);
  }
  
  // Injected Error: 5% Duplicate rows (adding exactly identical rows)
  const dupCount = Math.ceil(rowCount * 0.05);
  for (let d = 0; d < dupCount; d++) {
    const randomRowIdx = randRange(0, rows.length - 1);
    // Create duplicate
    rows.push([...rows[randomRowIdx]]);
  }
  
  // Shuffle rows
  rows.sort(() => Math.random() - 0.5);
  
  // Join headers and rows
  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => {
      // Escape commas in cells if any
      const cellStr = String(cell);
      return cellStr.includes(",") ? `"${cellStr}"` : cellStr;
    }).join(","))
  ].join("\n");
  
  return csvContent;
};
