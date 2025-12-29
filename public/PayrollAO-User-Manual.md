# PayrollAO - User Manual
## Complete System Guide

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Dashboard Overview](#dashboard-overview)
4. [Managing Employees](#managing-employees)
5. [Branch Management](#branch-management)
6. [Payroll Processing](#payroll-processing)
7. [Deductions Management](#deductions-management)
8. [Reports](#reports)
9. [Employee Cards](#employee-cards)
10. [Documents](#documents)
11. [Angola Labor Law Reference](#angola-labor-law-reference)
12. [Settings](#settings)
13. [Network Sharing](#network-sharing)
14. [Data Backup](#data-backup)
15. [Troubleshooting](#troubleshooting)

---

## 1. Introduction

PayrollAO is a comprehensive payroll management system designed specifically for Angolan businesses. It helps you manage employees, calculate salaries, handle deductions, and generate reports while complying with Angola's labor laws.

### Key Features:
- Employee management with complete profiles
- Multi-branch support
- Automated payroll calculations
- IRT (Income Tax) calculations per Angolan law
- Social Security (INSS) deductions
- Overtime and absence tracking
- Printable salary receipts and reports
- Data backup and restore
- LAN network sharing capabilities
- Bilingual support (Portuguese/English)

---

## 2. Getting Started

### First Launch

When you first open PayrollAO, you'll see the login screen.

### Navigation

The main navigation sidebar includes:
- **Dashboard** - Overview of your payroll system
- **Employees** - Manage employee records
- **Branches** - Manage company branches
- **Payroll** - Process monthly payroll
- **Deductions** - Configure deduction types
- **Reports** - Generate various reports
- **Employee Cards** - Print employee ID cards
- **Documents** - Document templates
- **Labor Law** - Angola labor law reference
- **Settings** - System configuration

### Language Selection

Click the language switcher in the top navigation bar to switch between:
- 🇵🇹 Portuguese
- 🇬🇧 English

---

## 3. Dashboard Overview

The dashboard provides a quick overview of your payroll system:

### Statistics Cards
- **Total Employees** - Number of active employees
- **Total Branches** - Number of company branches
- **Monthly Payroll** - Total payroll amount for current month
- **Pending Payments** - Employees awaiting payment

### Quick Actions
- Add new employee
- Process payroll
- Generate reports
- View recent activity

### Employee Table
Shows a summary of employees with:
- Name
- Position
- Department
- Base salary
- Status

---

## 4. Managing Employees

### Adding a New Employee

1. Go to **Employees** page
2. Click **"Add Employee"** button
3. Fill in the required information:

#### Personal Information
- Full Name (required)
- Date of Birth
- Gender
- Nationality
- ID Number (BI)
- Tax Number (NIF)
- Social Security Number (INSS)

#### Contact Information
- Phone Number
- Email Address
- Address
- City/Province

#### Employment Details
- Employee ID
- Position/Job Title
- Department
- Branch Assignment
- Employment Type (Full-time, Part-time, Contract)
- Start Date
- Base Salary (AOA)

#### Bank Information
- Bank Name
- Account Number
- IBAN

4. Click **"Save"** to add the employee

### Editing an Employee

1. Find the employee in the list
2. Click the **Edit** icon (pencil)
3. Modify the necessary fields
4. Click **"Save Changes"**

### Deactivating an Employee

1. Find the employee in the list
2. Click the **Edit** icon
3. Change status to **"Inactive"**
4. Enter termination date if applicable
5. Click **"Save Changes"**

### Searching Employees

Use the search bar at the top of the employee list to search by:
- Name
- Employee ID
- Department
- Position

### Filtering Employees

Filter employees by:
- Branch
- Department
- Status (Active/Inactive)
- Employment Type

---

## 5. Branch Management

### Adding a New Branch

1. Go to **Branches** page
2. Click **"Add Branch"** button
3. Enter branch details:
   - Branch Name
   - Branch Code
   - Address
   - City
   - Province
   - Phone Number
   - Email
   - Manager Name
4. Click **"Save"**

### Managing Branches

- View all branches in the list
- Edit branch details by clicking the Edit icon
- See employee count per branch
- Delete branches (only if no employees assigned)

---

## 6. Payroll Processing

### Monthly Payroll Workflow

#### Step 1: Select Period
1. Go to **Payroll** page
2. Select the **Month** and **Year**
3. Select the **Branch** (or "All Branches")

#### Step 2: Review Employees
- View all employees for the selected period
- Check base salaries and allowances
- Verify employee status

#### Step 3: Record Overtime (if applicable)
1. Click on an employee row
2. Click **"Add Overtime"**
3. Enter:
   - Date
   - Hours worked
   - Type (Normal 50%, Night 75%, Holiday 100%)
4. Save overtime record

#### Step 4: Record Absences (if applicable)
1. Click on an employee row
2. Click **"Record Absence"**
3. Enter:
   - Date(s)
   - Type (Justified, Unjustified, Medical)
   - Reason
4. Save absence record

#### Step 5: Calculate Payroll
1. Click **"Calculate Payroll"** button
2. System automatically calculates:
   - Gross Salary
   - IRT (Income Tax) based on tax brackets
   - INSS (Social Security) - 3% employee contribution
   - Other deductions
   - Net Salary

#### Step 6: Review Calculations
- Verify all calculations are correct
- Check deductions are properly applied
- Review net amounts

#### Step 7: Approve Payroll
1. Click **"Approve Payroll"**
2. Confirm the approval
3. Payroll is now locked for the period

### Printing Salary Receipts

1. Select an employee from the payroll list
2. Click **"Print Receipt"**
3. A printable salary receipt will be generated
4. Use browser print function (Ctrl+P / Cmd+P)

### Printing Payroll Sheet

1. Click **"Print Payroll Sheet"**
2. Select format:
   - Summary (totals only)
   - Detailed (all breakdowns)
3. Print or save as PDF

---

## 7. Deductions Management

### Types of Deductions

#### Mandatory Deductions (Automatic)
- **IRT** - Imposto sobre Rendimento do Trabalho (Income Tax)
- **INSS** - Social Security (3% employee, 8% employer)

#### Custom Deductions
- Loans/Advances
- Union fees
- Insurance
- Other deductions

### Adding a Custom Deduction Type

1. Go to **Deductions** page
2. Click **"Add Deduction Type"**
3. Enter:
   - Deduction Name
   - Type (Fixed Amount / Percentage)
   - Amount or Percentage
   - Description
4. Click **"Save"**

### Applying Deductions to Employees

1. In the employee's payroll record
2. Click **"Add Deduction"**
3. Select deduction type
4. Enter amount (if variable)
5. Select duration:
   - One-time
   - Recurring (specify months)
6. Save deduction

### IRT Tax Brackets (2024)

| Monthly Income (AOA) | Tax Rate |
|---------------------|----------|
| Up to 100,000 | 0% |
| 100,001 - 150,000 | 13% |
| 150,001 - 200,000 | 16% |
| 200,001 - 300,000 | 18% |
| 300,001 - 500,000 | 19% |
| 500,001 - 1,000,000 | 20% |
| 1,000,001 - 1,500,000 | 21% |
| 1,500,001 - 2,000,000 | 22% |
| 2,000,001 - 2,500,000 | 23% |
| 2,500,001 - 5,000,000 | 24% |
| Above 5,000,000 | 25% |

---

## 8. Reports

### Available Reports

#### Employee Reports
- Employee List (All or by Branch)
- Employee Details
- New Hires Report
- Terminations Report

#### Payroll Reports
- Monthly Payroll Summary
- Payroll by Department
- Payroll by Branch
- Year-to-Date Summary

#### Tax Reports
- IRT Summary Report
- INSS Contribution Report
- Annual Tax Report

#### Cost Analysis
- Labor Cost by Department
- Labor Cost by Branch
- Overtime Analysis
- Absence Analysis

#### Holiday Map
- Annual leave tracking
- Holiday balance per employee

### Generating a Report

1. Go to **Reports** page
2. Select report type
3. Choose filters:
   - Date range
   - Branch
   - Department
4. Click **"Generate Report"**
5. View on screen or print

### Exporting Reports

Reports can be exported as:
- PDF (Print to PDF)
- Print directly

---

## 9. Employee Cards

### Generating Employee ID Cards

1. Go to **Employee Cards** page
2. Select employees to include
3. Choose card template
4. Click **"Generate Cards"**
5. Print cards (recommend card stock paper)

### Card Information Includes:
- Employee photo (if uploaded)
- Full name
- Employee ID
- Position
- Department
- Company logo
- Issue date

---

## 10. Documents

### Available Templates

- Employment Contract
- Salary Certificate
- Employment Certificate
- Termination Letter
- Warning Letter

### Generating Documents

1. Go to **Documents** page
2. Select document type
3. Choose employee
4. Fill in additional details if required
5. Generate and print

---

## 11. Angola Labor Law Reference

The **Labor Law** page provides quick reference to:

### Working Hours
- Normal work week: 44 hours
- Maximum daily: 8 hours
- Rest period: Minimum 12 hours between shifts

### Overtime Rates
- Normal overtime: 50% extra
- Night overtime: 75% extra
- Holiday/Sunday: 100% extra

### Leave Entitlements
- Annual leave: 22 working days
- Sick leave: Per medical certificate
- Maternity leave: 90 days
- Paternity leave: 3 days

### Holidays
List of official Angolan public holidays

### Termination Rules
- Notice periods
- Severance calculations
- Final payment requirements

---

## 12. Settings

### General Settings

- **Company Information**
  - Company Name
  - Company Logo
  - Address
  - Tax Number (NIF)
  - Social Security Number

- **Payroll Settings**
  - Default work hours per day
  - Overtime calculation rules
  - Rounding preferences

### Network Settings

Configure LAN sharing:
- Server Mode (share data with other computers)
- Client Mode (connect to a server)
- Standalone Mode (no sharing)

See [Network Sharing](#network-sharing) section for details.

### Data Management

- **Export Data** - Save all data to a file
- **Import Data** - Restore from a backup file
- **Reset Data** - Clear all data (use with caution!)

### SQLite Backup

- Create database backups
- Restore from backup
- View backup history

---

## 13. Network Sharing

PayrollAO supports LAN (Local Area Network) sharing, allowing multiple computers to access the same data.

### Setting Up Server Mode

On the main computer (server):

1. Go to **Settings** → **Network Settings**
2. Select **"Server Mode"**
3. Set a port number (default: 3847)
4. Click **"Start Server"**
5. Note the IP address shown

### Setting Up Client Mode

On other computers (clients):

1. Go to **Settings** → **Network Settings**
2. Select **"Client Mode"**
3. Enter the server's IP address
4. Enter the port number
5. Click **"Connect"**

### Sync Options

- **Auto Sync** - Automatically sync changes
- **Manual Sync** - Manually push/pull data
- **Conflict Resolution** - How to handle conflicts

### Important Notes

- All computers must be on the same network
- Server computer must be running for clients to connect
- Backup data before first sync

---

## 14. Data Backup

### Automatic Backup

PayrollAO stores data locally in:
- Windows: `%APPDATA%/PayrollAO/`
- Linux: `~/.config/PayrollAO/`
- Mac: `~/Library/Application Support/PayrollAO/`

### Manual Export

1. Go to **Settings**
2. Click **"Export Data"**
3. Choose save location
4. Save the `.json` file

### Restoring Data

1. Go to **Settings**
2. Click **"Import Data"**
3. Select the backup file
4. Confirm import (this will replace current data)

### Best Practices

- Export data weekly
- Keep multiple backup copies
- Store backups on external drive or cloud
- Test restore process periodically

---

## 15. Troubleshooting

### Common Issues

#### App Won't Start
- Ensure you have the latest version
- Try running as Administrator
- Check antivirus isn't blocking the app

#### Data Not Saving
- Check write permissions to AppData folder
- Ensure disk has free space
- Try exporting and reimporting data

#### Calculations Seem Wrong
- Verify employee base salary is correct
- Check deduction configurations
- Review IRT tax brackets

#### Can't Connect to Server
- Verify both computers are on same network
- Check firewall settings
- Ensure server is running
- Verify IP address and port

#### Printing Issues
- Use Chrome or Edge for best print results
- Check printer settings
- Try "Print to PDF" first

### Getting Help

For additional support:
1. Check this manual first
2. Review the Labor Law reference
3. Contact your system administrator

---

## Appendix A: Keyboard Shortcuts

| Action | Windows | Mac |
|--------|---------|-----|
| Save | Ctrl + S | Cmd + S |
| Print | Ctrl + P | Cmd + P |
| Search | Ctrl + F | Cmd + F |
| New Employee | Ctrl + N | Cmd + N |

---

## Appendix B: Glossary

- **AOA** - Angolan Kwanza (currency)
- **BI** - Bilhete de Identidade (ID Card)
- **IRT** - Imposto sobre Rendimento do Trabalho (Income Tax)
- **INSS** - Instituto Nacional de Segurança Social (Social Security)
- **NIF** - Número de Identificação Fiscal (Tax Number)

---

## Document Information

**PayrollAO User Manual**  
Version 1.0  
Last Updated: December 2024

---

*This document is confidential and intended for authorized users only.*
