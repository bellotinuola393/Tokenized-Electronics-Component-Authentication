;; Manufacturer Verification Contract
;; Validates and manages authorized electronics manufacturers

(define-map manufacturers
  { manufacturer-id: uint }
  {
    name: (string-ascii 100),
    address: principal,
    certification-level: uint,
    is-active: bool,
    registration-date: uint
  }
)

(define-map manufacturer-by-principal
  { address: principal }
  { manufacturer-id: uint }
)

(define-data-var next-manufacturer-id uint u1)

;; Error codes
(define-constant ERR-NOT-AUTHORIZED (err u100))
(define-constant ERR-MANUFACTURER-EXISTS (err u101))
(define-constant ERR-MANUFACTURER-NOT-FOUND (err u102))
(define-constant ERR-INVALID-CERTIFICATION (err u103))

;; Admin principal
(define-data-var contract-admin principal tx-sender)

;; Register a new manufacturer
(define-public (register-manufacturer (name (string-ascii 100)) (manufacturer-address principal) (certification-level uint))
  (let ((manufacturer-id (var-get next-manufacturer-id)))
    (asserts! (is-eq tx-sender (var-get contract-admin)) ERR-NOT-AUTHORIZED)
    (asserts! (is-none (map-get? manufacturer-by-principal { address: manufacturer-address })) ERR-MANUFACTURER-EXISTS)
    (asserts! (and (>= certification-level u1) (<= certification-level u5)) ERR-INVALID-CERTIFICATION)

    (map-set manufacturers
      { manufacturer-id: manufacturer-id }
      {
        name: name,
        address: manufacturer-address,
        certification-level: certification-level,
        is-active: true,
        registration-date: block-height
      }
    )

    (map-set manufacturer-by-principal
      { address: manufacturer-address }
      { manufacturer-id: manufacturer-id }
    )

    (var-set next-manufacturer-id (+ manufacturer-id u1))
    (ok manufacturer-id)
  )
)

;; Verify if a manufacturer is authorized
(define-read-only (is-authorized-manufacturer (manufacturer-address principal))
  (match (map-get? manufacturer-by-principal { address: manufacturer-address })
    manufacturer-data
      (match (map-get? manufacturers { manufacturer-id: (get manufacturer-id manufacturer-data) })
        manufacturer-info (get is-active manufacturer-info)
        false
      )
    false
  )
)

;; Get manufacturer info
(define-read-only (get-manufacturer-info (manufacturer-id uint))
  (map-get? manufacturers { manufacturer-id: manufacturer-id })
)

;; Deactivate manufacturer
(define-public (deactivate-manufacturer (manufacturer-id uint))
  (let ((manufacturer-info (unwrap! (map-get? manufacturers { manufacturer-id: manufacturer-id }) ERR-MANUFACTURER-NOT-FOUND)))
    (asserts! (is-eq tx-sender (var-get contract-admin)) ERR-NOT-AUTHORIZED)

    (map-set manufacturers
      { manufacturer-id: manufacturer-id }
      (merge manufacturer-info { is-active: false })
    )
    (ok true)
  )
)
