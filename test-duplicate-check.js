// Simple test script to verify duplicate checking functionality
// This script simulates the duplicate check logic

const testDocument = {
  passport_front: {
    passportNumber: "A1234567"
  },
  aadhar: {
    aadhaarNumber: "123456789012"
  },
  pan: {
    panNumber: "ABCDE1234F"
  }
};

const existingRecords = [
  // Simulate existing records in Excel/Sheets format
  ["1", "ABCDE1234F", "987654321098", "John Doe", "M", "John", "Doe", "B9876543", "IN", "1990-01-01", "2020-01-01", "2030-01-01", "9876543210", "john@example.com", "", "", "", "", "", "", "Father Name", "Mother Name", "Spouse Name", "Delhi", "Mumbai", "John Doe", "Address", "", "", "", "", "", ""],
  ["2", "WXYZ9876G", "123456789012", "Jane Smith", "F", "Jane", "Smith", "A1234567", "IN", "1985-05-15", "2019-05-15", "2029-05-15", "9876543211", "jane@example.com", "", "", "", "", "", "", "Father Name", "Mother Name", "Spouse Name", "Bangalore", "Chennai", "Jane Smith", "Address", "", "", "", "", "", ""]
];

function checkForDuplicatesTest(doc) {
  const passportNumber = doc.passport_front?.passportNumber?.trim();
  const aadhaarNumber = doc.aadhar?.aadhaarNumber?.trim();
  const panNumber = doc.pan?.panNumber?.trim();
  
  // Check each data row for duplicates
  for (const row of existingRecords) {
    // Column indices: Passport No. (7), Aadhaar Number (2), PAN Number (1)
    const existingPassport = row[7]?.trim();
    const existingAadhaar = row[2]?.trim();
    const existingPAN = row[1]?.trim();
    
    // Check for Passport Number duplicate
    if (passportNumber && existingPassport && passportNumber === existingPassport) {
      return { hasDuplicate: true, duplicateField: "Passport Number", duplicateValue: passportNumber };
    }
    
    // Check for Aadhaar Number duplicate
    if (aadhaarNumber && existingAadhaar && aadhaarNumber === existingAadhaar) {
      return { hasDuplicate: true, duplicateField: "Aadhaar Number", duplicateValue: aadhaarNumber };
    }
    
    // Check for PAN Number duplicate
    if (panNumber && existingPAN && panNumber === existingPAN) {
      return { hasDuplicate: true, duplicateField: "PAN Number", duplicateValue: panNumber };
    }
  }
  
  return { hasDuplicate: false };
}

// Test cases
console.log("Testing duplicate check functionality...\n");

// Test 1: Duplicate Passport Number
console.log("Test 1: Duplicate Passport Number (A1234567)");
const result1 = checkForDuplicatesTest(testDocument);
console.log("Result:", result1);
console.log("Expected: { hasDuplicate: true, duplicateField: 'Passport Number', duplicateValue: 'A1234567' }");
console.log("✓" + (result1.hasDuplicate && result1.duplicateField === "Passport Number" ? " PASS" : " FAIL"));

// Test 2: Duplicate Aadhaar Number  
console.log("\nTest 2: Duplicate Aadhaar Number (123456789012)");
const result2 = checkForDuplicatesTest(testDocument);
console.log("Result:", result2);
console.log("Expected: { hasDuplicate: true, duplicateField: 'Aadhaar Number', duplicateValue: '123456789012' }");
console.log("✓" + (result2.hasDuplicate && result2.duplicateField === "Aadhaar Number" ? " PASS" : " FAIL"));

// Test 3: Duplicate PAN Number
console.log("\nTest 3: Duplicate PAN Number (ABCDE1234F)");
const result3 = checkForDuplicatesTest(testDocument);
console.log("Result:", result3);
console.log("Expected: { hasDuplicate: true, duplicateField: 'PAN Number', duplicateValue: 'ABCDE1234F' }");
console.log("✓" + (result3.hasDuplicate && result3.duplicateField === "PAN Number" ? " PASS" : " FAIL"));

// Test 4: No duplicates (new record)
const newDocument = {
  passport_front: { passportNumber: "C9999999" },
  aadhar: { aadhaarNumber: "999999999999" },
  pan: { panNumber: "NEWPA1234N" }
};

console.log("\nTest 4: No duplicates (new record)");
const result4 = checkForDuplicatesTest(newDocument);
console.log("Result:", result4);
console.log("Expected: { hasDuplicate: false }");
console.log("✓" + (!result4.hasDuplicate ? " PASS" : " FAIL"));

console.log("\nAll tests completed!");