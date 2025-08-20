# 🚚 FleetFix: Full Feature Fleet Management Platform

A clean, web-based platform for independent trucking companies (1–50 trucks) to track maintenance, repairs, parts, and downtime.

## 🔑 Core Purpose
Built specifically for smaller fleet operations that are underserved by large fleet systems like Fleetio or Samsara.

## 🧱 Core Features 

### 1. Vehicle Management
- Add/Edit Trucks with VIN, license plate, make/model, year, mileage
- Truck nickname or ID system
- Status Tags: "In Service", "Out for Repair", "Needs Attention", "Retired"

### 2. Maintenance Logs
- Log Entries: oil change, tire replacement, engine service, brake inspection, etc.
- Date & mileage tracking at service
- Cost tracking and notes/images support
- Reminders: mileage-based and date-based notifications

### 3. Parts Tracking
- Add/Track Parts with part name, part number
- Track which trucks used specific parts
- Cost & installation date logging
- Optional basic inventory tracking

### 4. Downtime Analytics
- Log Downtime Events with start/end times
- Categorize causes (scheduled maintenance, unexpected failure, accident, etc.)
- Calculate Total Downtime per truck & fleet
- Compare uptime % across trucks

### 5. Maintenance Calendar View
- Visual calendar of upcoming service items and completed tasks
- Filter by truck or task type

### 6. Search & Filter Dashboard
- Filter vehicles by status, service history, mileage thresholds
- Search part history or downtime logs

### 7. CSV Export & Print Logs
- Export maintenance or repair logs for insurance, audits, or resale
- Printable logbooks per truck


## Getting Started

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000) to view it in the browser.


