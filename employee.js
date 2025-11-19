// --- MODEL LAYER ---
class Employee {
    constructor(id, name, jobTitle, performanceCode, department = 'Unassigned', salary = 50000) {
        this.id = id;
        this.name = name;
        this.jobTitle = jobTitle;
        this.performanceCode = performanceCode ? performanceCode.toUpperCase() : 'C';

        this.department = department;
        this.salary = parseFloat(salary);
        this.hireDate = new Date().toISOString().slice(0, 10);
        this.isHighPerformer = this.performanceCode === 'A';
    }

    getAnnualBonus() {
        switch (this.performanceCode) {
            case 'A': return this.salary * 0.15;
            case 'B': return this.salary * 0.08;
            default: return 0;
        }
    }

    toString() {
        return `[EMP ${this.id}] ${this.name} (${this.jobTitle}) - Dept: ${this.department}, Perf: ${this.performanceCode}`;
    }
}

// --- REPOSITORY LAYER (Data Access) ---
class EmployeeRepository {
    constructor() {
        this.STORAGE_KEY = 'employeeData';
        this.NEXT_ID_KEY = 'nextEmployeeId';
        this.employees = this.loadAll();
        this.nextId = parseInt(localStorage.getItem(this.NEXT_ID_KEY) || '1');
    }

    loadAll() {
        const data = localStorage.getItem(this.STORAGE_KEY);
        if (!data) return [];
        return JSON.parse(data).map(item => 
            new Employee(item.id, item.name, item.jobTitle, item.performanceCode, item.department, item.salary)
        );
    }

    saveAll() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.employees));
        localStorage.setItem(this.NEXT_ID_KEY, this.nextId.toString());
    }

    findAll() {
        return this.employees;
    }

    findById(id) {
        return this.employees.find(emp => emp.id === id);
    }

    save(employeeData) {
        const id = employeeData.id;
        
        if (id) {
            const index = this.employees.findIndex(emp => emp.id === id);
            if (index !== -1) {
                Object.assign(this.employees[index], employeeData);
                this.saveAll();
                return this.employees[index];
            }
        } else {
            const newEmployee = new Employee(
                this.nextId++,
                employeeData.name,
                employeeData.jobTitle,
                employeeData.performanceCode,
                employeeData.department,
                employeeData.salary
            );
            this.employees.push(newEmployee);
            this.saveAll();
            return newEmployee;
        }
        return null;
    }

    deleteById(id) {
        const initialLength = this.employees.length;
        this.employees = this.employees.filter(emp => emp.id !== id);
        this.saveAll();
        return this.employees.length < initialLength;
    }
}

// --- SERVICE LAYER (Business Logic) ---
class EmployeeService {
    constructor(repository) {
        this.repository = repository;
        this.MIN_SALARY = 40000;
    }

    getAllEmployees() {
        return this.repository.findAll().sort((a, b) => a.id - b.id);
    }

    getHighPerformers() {
        return this.repository.findAll().filter(emp => emp.isHighPerformer);
    }

    saveEmployee(data) {
        // Business Rule: Salary Validation
        if (data.salary < this.MIN_SALARY && data.performanceCode !== 'A') {
            return { success: false, message: `Hiring/Update blocked: Salary must be $${this.MIN_SALARY} or higher for non-A performers.` };
        }

        const result = this.repository.save(data);
        if (result) {
            return { 
                success: true, 
                message: data.id ? `Employee ID ${data.id} updated successfully.` : `New employee ${result.name} saved with ID ${result.id}.`,
                employee: result
            };
        }
        return { success: false, message: "Save failed due to an unknown error." };
    }
    
    removeEmployee(id) {
        return this.repository.deleteById(id);
    }

    processInitialHire(name, jobTitle, performanceCode, department, salary) {
        const data = { name, jobTitle, performanceCode, department, salary };
        const result = this.repository.save(data);
        if (result) {
            this.repository.nextId = result.id + 1;
            this.repository.saveAll();
        }
    }
}

// --- CONTROLLER/UI LAYER ---
const employeeRepository = new EmployeeRepository();
const employeeService = new EmployeeService(employeeRepository);

let employeeIdToDelete = null;
const modal = document.getElementById('deleteModal');
const statusMessage = document.getElementById('status-message');


document.addEventListener('DOMContentLoaded', () => {
    // Initialize dummy data if empty
    if (employeeService.getAllEmployees().length === 0) {
        employeeService.processInitialHire('madhukar', 'Marketing Manager', 'A', 'Marketing', 95000);
        employeeService.processInitialHire('sridhar', 'Software Engineer', 'B', 'Engineering', 75000);
        employeeService.processInitialHire('sai teja', 'Junior Assistant', 'C', 'HR', 45000);
    }
    
    document.getElementById('employee-form').addEventListener('submit', handleFormSubmit);
    displayEmployees();
});

function handleFormSubmit(event) {
    event.preventDefault();
    
    const id = document.getElementById('employee-id').value ? parseInt(document.getElementById('employee-id').value) : null;
    const name = document.getElementById('name').value;
    const jobTitle = document.getElementById('jobTitle').value;
    const department = document.getElementById('department').value;
    const salary = parseFloat(document.getElementById('salary').value);
    const performanceCode = document.getElementById('performanceCode').value;

    const employeeData = { id, name, jobTitle, department, salary, performanceCode };
    
    const result = employeeService.saveEmployee(employeeData);

    if (result.success) {
        setStatus(result.message, 'text-green-600');
    } else {
        setStatus(result.message, 'text-red-600');
    }

    resetForm();
    displayEmployees();
}

function resetForm() {
    document.getElementById('employee-form').reset();
    document.getElementById('employee-id').value = '';
    document.getElementById('form-title').textContent = 'Add New Employee';
    document.getElementById('submit-button').textContent = 'Save New Employee';
    document.getElementById('submit-button').classList.remove('bg-green-600', 'hover:bg-green-700');
    document.getElementById('submit-button').classList.add('bg-blue-600', 'hover:bg-blue-700');
    
    document.getElementById('department').value = 'Unassigned';
    document.getElementById('salary').value = 50000;
}

function editEmployee(id) {
    const employee = employeeService.getAllEmployees().find(emp => emp.id === parseInt(id));
    if (employee) {
        document.getElementById('employee-id').value = employee.id;
        document.getElementById('name').value = employee.name;
        document.getElementById('jobTitle').value = employee.jobTitle;
        document.getElementById('department').value = employee.department;
        document.getElementById('salary').value = employee.salary;
        document.getElementById('performanceCode').value = employee.performanceCode;
        
        document.getElementById('form-title').textContent = `Update Employee: ${employee.name}`;
        document.getElementById('submit-button').textContent = 'Update Employee Details';
        document.getElementById('submit-button').classList.remove('bg-blue-600', 'hover:bg-blue-700');
        document.getElementById('submit-button').classList.add('bg-green-600', 'hover:bg-green-700');
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setStatus(`Editing Employee ID ${employee.id}.`, 'text-blue-600');
    }
}

function displayEmployees() {
    const employees = employeeService.getAllEmployees();
    const container = document.getElementById('employee-list-container');
    
    if (employees.length === 0) {
        container.innerHTML = `
            <div class="text-center p-10 bg-yellow-50 rounded-xl">
                <p class="text-xl text-yellow-700 font-bold">No employees found! Please add your first employee.</p>
            </div>
        `;
        return;
    }

    let tableHTML = `
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-100">
                <tr>
                    <th class="px-3 py-4 text-left text-sm font-bold text-gray-600 uppercase tracking-wider">ID</th>
                    <th class="px-3 py-4 text-left text-sm font-bold text-gray-600 uppercase tracking-wider">Name</th>
                    <th class="px-3 py-4 text-left text-sm font-bold text-gray-600 uppercase tracking-wider">Title</th>
                    <th class="px-3 py-4 text-left text-sm font-bold text-gray-600 uppercase tracking-wider">Dept</th>
                    <th class="px-3 py-4 text-right text-sm font-bold text-gray-600 uppercase tracking-wider">Salary ($)</th>
                    <th class="px-3 py-4 text-center text-sm font-bold text-gray-600 uppercase tracking-wider">Perf</th>
                    <th class="px-3 py-4 text-center text-sm font-bold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
    `;

    employees.forEach(emp => {
        const bonus = emp.getAnnualBonus().toLocaleString('en-US', { style: 'currency', currency: 'USD' });
        const salary = emp.salary.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
        
        tableHTML += `
            <tr class="hover:bg-gray-50 transition duration-150">
                <td class="px-3 py-4 whitespace-nowrap text-base font-medium text-gray-900">${emp.id}</td>
                <td class="px-3 py-4 whitespace-nowrap text-lg font-semibold text-gray-700">${emp.name}</td>
                <td class="px-3 py-4 whitespace-nowrap text-base text-gray-600">${emp.jobTitle}</td>
                <td class="px-3 py-4 whitespace-nowrap text-base text-gray-600">${emp.department}</td>
                <td class="px-3 py-4 whitespace-nowrap text-base text-gray-600 text-right">${salary}</td>
                <td class="px-3 py-4 whitespace-nowrap text-center">
                    <span title="Bonus: ${bonus}" class="inline-flex items-center px-4 py-1.5 rounded-full text-base font-bold shadow-md performance-${emp.performanceCode}">
                        ${emp.performanceCode}
                    </span>
                </td>
                <td class="px-3 py-4 whitespace-nowrap text-center text-base font-medium space-x-2">
                    <button onclick="editEmployee(${emp.id})"
                        class="text-indigo-600 hover:text-indigo-900 font-semibold transition duration-150">
                        Edit
                    </button>
                    <button onclick="openDeleteModal(${emp.id})"
                        class="text-red-600 hover:text-red-900 font-semibold transition duration-150">
                        Delete
                    </button>
                </td>
            </tr>
        `;
    });

    tableHTML += `</tbody></table>`;
    container.innerHTML = tableHTML;
}

function setStatus(message, colorClass) {
    statusMessage.textContent = message;
    statusMessage.className = `text-lg font-semibold pt-2 ${colorClass}`;
    setTimeout(() => {
        statusMessage.textContent = '';
        statusMessage.className = 'text-lg font-semibold pt-2';
    }, 5000);
}

function openDeleteModal(employeeId) {
    employeeIdToDelete = employeeId;
    modal.style.display = 'flex';
}

function closeDeleteModal() {
    employeeIdToDelete = null;
    modal.style.display = 'none';
}

function executeDelete() {
    if (employeeIdToDelete) {
        const success = employeeService.removeEmployee(employeeIdToDelete);
        if (success) {
            setStatus(`Employee ID ${employeeIdToDelete} deleted successfully.`, 'text-red-600');
        } else {
            setStatus(`Error deleting Employee ID ${employeeIdToDelete}.`, 'text-yellow-700');
        }
    }
    closeDeleteModal();
    displayEmployees();
}