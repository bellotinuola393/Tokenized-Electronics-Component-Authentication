// Manufacturer Verification Contract Tests
import { describe, it, expect, beforeEach } from "vitest"

// Mock contract state for testing
const contractState = {
  manufacturers: new Map(),
  manufacturerByPrincipal: new Map(),
  nextManufacturerId: 1,
  contractAdmin: "SP1234567890ABCDEF",
}

// Mock contract functions
const mockContract = {
  registerManufacturer: (name, address, certLevel, sender) => {
    if (sender !== contractState.contractAdmin) {
      return { error: 100 } // ERR-NOT-AUTHORIZED
    }
    
    if (contractState.manufacturerByPrincipal.has(address)) {
      return { error: 101 } // ERR-MANUFACTURER-EXISTS
    }
    
    if (certLevel < 1 || certLevel > 5) {
      return { error: 103 } // ERR-INVALID-CERTIFICATION
    }
    
    const manufacturerId = contractState.nextManufacturerId
    
    contractState.manufacturers.set(manufacturerId, {
      name,
      address,
      certificationLevel: certLevel,
      isActive: true,
      registrationDate: 1000,
    })
    
    contractState.manufacturerByPrincipal.set(address, manufacturerId)
    contractState.nextManufacturerId++
    
    return { success: manufacturerId }
  },
  
  isAuthorizedManufacturer: (address) => {
    const manufacturerId = contractState.manufacturerByPrincipal.get(address)
    if (!manufacturerId) return false
    
    const manufacturer = contractState.manufacturers.get(manufacturerId)
    return manufacturer ? manufacturer.isActive : false
  },
  
  getManufacturerInfo: (manufacturerId) => {
    return contractState.manufacturers.get(manufacturerId) || null
  },
  
  deactivateManufacturer: (manufacturerId, sender) => {
    if (sender !== contractState.contractAdmin) {
      return { error: 100 } // ERR-NOT-AUTHORIZED
    }
    
    const manufacturer = contractState.manufacturers.get(manufacturerId)
    if (!manufacturer) {
      return { error: 102 } // ERR-MANUFACTURER-NOT-FOUND
    }
    
    contractState.manufacturers.set(manufacturerId, {
      ...manufacturer,
      isActive: false,
    })
    
    return { success: true }
  },
}

describe("Manufacturer Verification Contract", () => {
  beforeEach(() => {
    // Reset contract state before each test
    contractState.manufacturers.clear()
    contractState.manufacturerByPrincipal.clear()
    contractState.nextManufacturerId = 1
  })
  
  describe("registerManufacturer", () => {
    it("should successfully register a new manufacturer", () => {
      const result = mockContract.registerManufacturer(
          "Acme Electronics",
          "SP2468MANUFACTURER",
          3,
          "SP1234567890ABCDEF",
      )
      
      expect(result.success).toBe(1)
      expect(contractState.manufacturers.get(1)).toEqual({
        name: "Acme Electronics",
        address: "SP2468MANUFACTURER",
        certificationLevel: 3,
        isActive: true,
        registrationDate: 1000,
      })
    })
    
    it("should reject registration by non-admin", () => {
      const result = mockContract.registerManufacturer(
          "Acme Electronics",
          "SP2468MANUFACTURER",
          3,
          "SP9999999999999999", // Different from admin
      )
      
      expect(result.error).toBe(100) // ERR-NOT-AUTHORIZED
    })
    
    it("should reject duplicate manufacturer registration", () => {
      // Register first time
      mockContract.registerManufacturer("Acme Electronics", "SP2468MANUFACTURER", 3, "SP1234567890ABCDEF")
      
      // Try to register again
      const result = mockContract.registerManufacturer(
          "Another Name",
          "SP2468MANUFACTURER", // Same address
          4,
          "SP1234567890ABCDEF",
      )
      
      expect(result.error).toBe(101) // ERR-MANUFACTURER-EXISTS
    })
    
    it("should reject invalid certification levels", () => {
      const result1 = mockContract.registerManufacturer(
          "Acme Electronics",
          "SP2468MANUFACTURER",
          0, // Invalid: too low
          "SP1234567890ABCDEF",
      )
      
      const result2 = mockContract.registerManufacturer(
          "Acme Electronics",
          "SP2468MANUFACTURER",
          6, // Invalid: too high
          "SP1234567890ABCDEF",
      )
      
      expect(result1.error).toBe(103) // ERR-INVALID-CERTIFICATION
      expect(result2.error).toBe(103) // ERR-INVALID-CERTIFICATION
    })
    
    it("should increment manufacturer ID correctly", () => {
      const result1 = mockContract.registerManufacturer(
          "Acme Electronics",
          "SP2468MANUFACTURER1",
          3,
          "SP1234567890ABCDEF",
      )
      
      const result2 = mockContract.registerManufacturer(
          "Beta Components",
          "SP2468MANUFACTURER2",
          4,
          "SP1234567890ABCDEF",
      )
      
      expect(result1.success).toBe(1)
      expect(result2.success).toBe(2)
      expect(contractState.nextManufacturerId).toBe(3)
    })
  })
  
  describe("isAuthorizedManufacturer", () => {
    it("should return true for active authorized manufacturer", () => {
      mockContract.registerManufacturer("Acme Electronics", "SP2468MANUFACTURER", 3, "SP1234567890ABCDEF")
      
      const isAuthorized = mockContract.isAuthorizedManufacturer("SP2468MANUFACTURER")
      expect(isAuthorized).toBe(true)
    })
    
    it("should return false for non-existent manufacturer", () => {
      const isAuthorized = mockContract.isAuthorizedManufacturer("SP9999999999999999")
      expect(isAuthorized).toBe(false)
    })
    
    it("should return false for deactivated manufacturer", () => {
      // Register manufacturer
      mockContract.registerManufacturer("Acme Electronics", "SP2468MANUFACTURER", 3, "SP1234567890ABCDEF")
      
      // Deactivate manufacturer
      mockContract.deactivateManufacturer(1, "SP1234567890ABCDEF")
      
      const isAuthorized = mockContract.isAuthorizedManufacturer("SP2468MANUFACTURER")
      expect(isAuthorized).toBe(false)
    })
  })
  
  describe("getManufacturerInfo", () => {
    it("should return manufacturer information", () => {
      mockContract.registerManufacturer("Acme Electronics", "SP2468MANUFACTURER", 3, "SP1234567890ABCDEF")
      
      const info = mockContract.getManufacturerInfo(1)
      expect(info).toEqual({
        name: "Acme Electronics",
        address: "SP2468MANUFACTURER",
        certificationLevel: 3,
        isActive: true,
        registrationDate: 1000,
      })
    })
    
    it("should return null for non-existent manufacturer", () => {
      const info = mockContract.getManufacturerInfo(999)
      expect(info).toBe(null)
    })
  })
  
  describe("deactivateManufacturer", () => {
    it("should successfully deactivate manufacturer", () => {
      // Register manufacturer
      mockContract.registerManufacturer("Acme Electronics", "SP2468MANUFACTURER", 3, "SP1234567890ABCDEF")
      
      // Deactivate manufacturer
      const result = mockContract.deactivateManufacturer(1, "SP1234567890ABCDEF")
      
      expect(result.success).toBe(true)
      expect(contractState.manufacturers.get(1).isActive).toBe(false)
    })
    
    it("should reject deactivation by non-admin", () => {
      // Register manufacturer
      mockContract.registerManufacturer("Acme Electronics", "SP2468MANUFACTURER", 3, "SP1234567890ABCDEF")
      
      // Try to deactivate as non-admin
      const result = mockContract.deactivateManufacturer(1, "SP9999999999999999")
      
      expect(result.error).toBe(100) // ERR-NOT-AUTHORIZED
    })
    
    it("should reject deactivation of non-existent manufacturer", () => {
      const result = mockContract.deactivateManufacturer(999, "SP1234567890ABCDEF")
      
      expect(result.error).toBe(102) // ERR-MANUFACTURER-NOT-FOUND
    })
  })
})

console.log("✅ Manufacturer Verification Contract tests completed")
