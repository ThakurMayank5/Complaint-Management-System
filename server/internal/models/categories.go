package models

type Category string

const (
	CrimeReportCategory      Category = "Crime Report"
	TheftCategory            Category = "Theft"
	MissingPersonCategory    Category = "Missing Person"
	TrafficViolationCategory Category = "Traffic Violation"
	CybercrimeCategory       Category = "Cybercrime"

	GarbageCategory      Category = "Garbage"
	RoadsCategory        Category = "Roads"
	StreetLightsCategory Category = "Street Lights"
	DrainageCategory     Category = "Drainage"
	WaterSupplyCategory  Category = "Water Supply"

	HospitalComplaintCategory    Category = "Hospital Complaint"
	MedicineAvailabilityCategory Category = "Medicine Availability"
	AmbulanceCategory            Category = "Ambulance"
	PublicHealthCategory         Category = "Public Health"
	SanitationCategory           Category = "Sanitation"

	PowerOutageCategory    Category = "Power Outage"
	StreetLightingCategory Category = "Street Lighting"
	BillingCategory        Category = "Billing"
	TransformerCategory    Category = "Transformer"

	PublicTransportCategory Category = "Public Transport"
	TrafficCategory         Category = "Traffic"
	BusServiceCategory      Category = "Bus Service"
	ParkingCategory         Category = "Parking"
)

// Government
// │
// ├── Police Department
// │     ├── Crime Report
// │     ├── Theft
// │     ├── Missing Person
// │     ├── Traffic Violation
// │     └── Cybercrime
// │
// ├── Municipal Corporation
// │     ├── Garbage
// │     ├── Roads
// │     ├── Street Lights
// │     ├── Drainage
// │     └── Water Supply
// │
// ├── Health Department
// │     ├── Hospital Complaint
// │     ├── Medicine Availability
// │     ├── Ambulance
// │     ├── Public Health
// │     └── Sanitation
// │
// ├── Electricity Department
// │     ├── Power Outage
// │     ├── Street Lighting
// │     ├── Billing
// │     └── Transformer
// │
// └── Transport Department
//       ├── Public Transport
//       ├── Traffic
//       ├── Bus Service
//       └── Parking
