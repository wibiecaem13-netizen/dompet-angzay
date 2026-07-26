// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            })
            .catch(error => {
                console.log('ServiceWorker registration failed: ', error);
            });
    });
}

// Global state
let transactions = JSON.parse(localStorage.getItem('kasku_transactions')) || [];
let walletName = localStorage.getItem('kasku_wallet_name') || 'KAS-KU';
let savingsTarget = Number(localStorage.getItem('kasku_target')) || 0;
let quickNotes = localStorage.getItem('kasku_notes') || '';
let financeChart = null;

// Backup keys
const KASKU_TRANSACTIONS_BACKUP_KEY = 'kasku_transactions_backup';
const KASKU_WALLET_NAME_BACKUP_KEY = 'kasku_wallet_name_backup';
const KASKU_TARGET_BACKUP_KEY = 'kasku_target_backup';
const KASKU_NOTES_BACKUP_KEY = 'kasku_notes_backup';

// DOM Elements
const walletTitleDisplay = document.getElementById('wallet-title-display');
const walletModal = document.getElementById('wallet-modal');
const walletNameInput = document.getElementById('wallet-name-input');
const targetModal = document.getElementById('target-modal');
const targetInputFormatted = document.getElementById('target-input-formatted');
const targetInput = document.getElementById('target-input');
const targetDisplay = document.getElementById('target-display');
const targetProgressBar = document.getElementById('target-progress-bar');
const notesModal = document.getElementById('notes-modal');
const notesTextarea = document.getElementById('notes-textarea');
const notesPreview = document.getElementById('notes-preview');
const resetModal = document.getElementById('reset-modal');
const resetConfirmInput = document.getElementById('reset-confirm-input');
const periodSelector = document.getElementById('period-selector');
const periodIncomeEl = document.getElementById('period-income');
const periodExpenseEl = document.getElementById('period-expense');
const form = document.getElementById('transaction-form');
const descInput = document.getElementById('description');
const amountFormattedInput = document.getElementById('amount-formatted');
const amountInput = document.getElementById('amount');
const typeInput = document.getElementById('type');
const categoryInput = document.getElementById('category');
const totalBalanceEl = document.getElementById('total-balance');
const TRANSACTION_CATEGORIES = [ // Define categories as a constant
    { value: "Gaji", label: "Gaji / Pendapatan" },
    { value: "Makanan", label: "Makanan & Minuman" },
    { value: "Transportasi", label: "Transportasi" },
    { value: "Belanja", label: "Belanja" },
    { value: "Tagihan", label: "Tagihan & Utilitas" },
    { value: "Lainnya", label: "Lainnya" }
];
const totalIncomeEl = document.getElementById('total-income');
const totalExpenseEl = document.getElementById('total-expense');
const transactionListEl = document.getElementById('transaction-list');
const filterTypeEl = document.getElementById('filter-type');
const themeToggleButton = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');

// Edit Modal Elements
const editTransactionModal = document.getElementById('edit-transaction-modal');
const editTransactionForm = document.getElementById('edit-transaction-form');
const editTransactionId = document.getElementById('edit-transaction-id');
const editDescription = document.getElementById('edit-description');
const editAmountFormatted = document.getElementById('edit-amount-formatted');
const editAmount = document.getElementById('edit-amount');
const editType = document.getElementById('edit-type');
const editCategory = document.getElementById('edit-category');

// New DOM Elements for refactored event listeners
const editWalletNameButton = document.getElementById('edit-wallet-name-button');
const exportExcelButton = document.getElementById('export-excel-button');
const openTargetModalButton = document.getElementById('open-target-modal-button');
const openNotesModalButton = document.getElementById('open-notes-modal-button');
const openResetModalButton = document.getElementById('open-reset-modal-button');
const closeWalletModalButton = document.getElementById('close-wallet-modal-button');
const saveWalletNameButton = document.getElementById('save-wallet-name-button');
const closeTargetModalButton = document.getElementById('close-target-modal-button');
const saveTargetButton = document.getElementById('save-target-button');
const closeNotesModalButton = document.getElementById('close-notes-modal-button');
const saveNotesButton = document.getElementById('save-notes-button');
const closeEditTransactionModalButton = document.getElementById('close-edit-transaction-modal-button');

const openBackupRestoreModalButton = document.getElementById('open-backup-restore-modal-button');
const closeBackupRestoreModalButton = document.getElementById('close-backup-restore-modal-button');
const saveBackupButton = document.getElementById('save-backup-button');
const restoreBackupButton = document.getElementById('restore-backup-button');

// New DOM Elements for modal content (for animation)
const walletModalContent = document.getElementById('wallet-modal-content');
const targetModalContent = document.getElementById('target-modal-content');
const notesModalContent = document.getElementById('notes-modal-content');
const resetModalContent = document.getElementById('reset-modal-content');
const editTransactionModalContent = document.getElementById('edit-transaction-modal-content');

const backupRestoreModal = document.getElementById('backup-restore-modal');
const backupRestoreModalContent = document.getElementById('backup-restore-modal-content');
// --- Theme Management ---
const handleThemeToggle = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('kasku_theme', isDark ? 'dark' : 'light');
    updateThemeIcon(isDark);
    updateChartTheme();
};

const updateThemeIcon = (isDark) => {
    themeIcon.classList.toggle('fa-sun', !isDark);
    themeIcon.classList.toggle('fa-moon', isDark);
};

const updateChartTheme = () => {
    if (financeChart) {
        const isDark = document.documentElement.classList.contains('dark');
        const newLabelColor = isDark ? '#e2e8f0' : '#334155';
        financeChart.options.plugins.legend.labels.color = newLabelColor;
        financeChart.update();
    }
};

themeToggleButton.addEventListener('click', handleThemeToggle);
// Initial icon setup
updateThemeIcon(document.documentElement.classList.contains('dark'));


// --- Modal Animation Helper ---
function toggleModalAnimation(modalElement, contentElement, show, focusElement = null) {
    if (show) {
        modalElement.classList.remove('pointer-events-none');
        modalElement.classList.add('opacity-100');
        // Allow browser to render opacity change before starting transform
        requestAnimationFrame(() => {
            contentElement.classList.remove('translate-y-4', 'opacity-0');
            contentElement.classList.add('opacity-100');
            if (focusElement) {
                focusElement.focus();
            }
        });
    } else {
        modalElement.classList.remove('opacity-100');
        contentElement.classList.add('translate-y-4', 'opacity-0');
        contentElement.classList.remove('opacity-100');
        // After transition, hide modal completely and disable pointer events
        setTimeout(() => {
            modalElement.classList.add('pointer-events-none');
        }, 300); // Match transition duration
    }
}

// --- Modal Functions ---
function openEditWalletModal() { walletNameInput.value = walletName; toggleModalAnimation(walletModal, walletModalContent, true, walletNameInput); }
function closeEditWalletModal() { toggleModalAnimation(walletModal, walletModalContent, false); }
function saveWalletName() {
    const newName = walletNameInput.value.trim();
    if (newName) { walletName = newName; walletTitleDisplay.textContent = walletName; localStorage.setItem('kasku_wallet_name', walletName); }
    closeEditWalletModal();
}

function openTargetModal() { targetInputFormatted.value = savingsTarget ? savingsTarget.toLocaleString('id-ID') : ''; targetInput.value = savingsTarget; toggleModalAnimation(targetModal, targetModalContent, true, targetInputFormatted); }
function closeTargetModal() { toggleModalAnimation(targetModal, targetModalContent, false); }
function saveTarget() { savingsTarget = Number(targetInput.value) || 0; localStorage.setItem('kasku_target', savingsTarget); updateUI(); closeTargetModal(); }

function openNotesModal() { notesTextarea.value = quickNotes; toggleModalAnimation(notesModal, notesModalContent, true, notesTextarea); }
function closeNotesModal() { toggleModalAnimation(notesModal, notesModalContent, false); }
function saveNotes() { quickNotes = notesTextarea.value.trim(); notesPreview.textContent = quickNotes || 'Klik untuk tulis catatan...'; localStorage.setItem('kasku_notes', quickNotes); closeNotesModal(); }

function openResetModal() { resetConfirmInput.value = ''; toggleModalAnimation(resetModal, resetModalContent, true, resetConfirmInput); }
function closeResetModal() { toggleModalAnimation(resetModal, resetModalContent, false); }
function executeResetData() {
    if (resetConfirmInput.value.trim() === 'RESET') {
        transactions = [];
        localStorage.removeItem('kasku_transactions');
        updateUI();
        closeResetModal();
        alert('Data berhasil direset bersih.');
    } else { alert('Konfirmasi salah! Ketik kata RESET dengan benar.'); resetConfirmInput.focus(); }
}

function openBackupRestoreModal() {
    toggleModalAnimation(backupRestoreModal, backupRestoreModalContent, true);
}

function closeBackupRestoreModal() {
    toggleModalAnimation(backupRestoreModal, backupRestoreModalContent, false);
}

function saveBackup() {
    localStorage.setItem(KASKU_TRANSACTIONS_BACKUP_KEY, JSON.stringify(transactions));
    localStorage.setItem(KASKU_WALLET_NAME_BACKUP_KEY, walletName);
    localStorage.setItem(KASKU_TARGET_BACKUP_KEY, savingsTarget.toString());
    localStorage.setItem(KASKU_NOTES_BACKUP_KEY, quickNotes);
    alert('Data berhasil dicadangkan!');
    closeBackupRestoreModal();
}

function restoreBackup() {
    const backupTransactions = localStorage.getItem(KASKU_TRANSACTIONS_BACKUP_KEY);
    if (!backupTransactions) {
        alert('Tidak ada data cadangan yang ditemukan.');
        return;
    }

    if (confirm('Apakah Anda yakin ingin memulihkan data dari cadangan? Data saat ini akan ditimpa.')) {
        transactions = JSON.parse(backupTransactions);
        walletName = localStorage.getItem(KASKU_WALLET_NAME_BACKUP_KEY) || 'KAS-KU';
        savingsTarget = Number(localStorage.getItem(KASKU_TARGET_BACKUP_KEY)) || 0;
        quickNotes = localStorage.getItem(KASKU_NOTES_BACKUP_KEY) || '';
        updateUI();
        alert('Data berhasil dipulihkan dari cadangan!');
        closeBackupRestoreModal();
    }
}

// --- Edit Transaction Modal ---
function openEditTransactionModal(id) {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;

    editTransactionId.value = transaction.id;
    editDescription.value = transaction.description;
    editAmountFormatted.value = transaction.amount.toLocaleString('id-ID');
    editAmount.value = transaction.amount;
    editType.value = transaction.type;
    editCategory.value = transaction.category;

    toggleModalAnimation(editTransactionModal, editTransactionModalContent, true, editDescription);
}

function closeEditTransactionModal() {
    toggleModalAnimation(editTransactionModal, editTransactionModalContent, false);
}
editTransactionForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = editTransactionId.value; // Use Number(editAmount.value) directly as setupNumericInput already handles it
    const rawAmount = Number(editAmount.value); // Fixed: remove redundant .replace(/\./g, '')
    if (!rawAmount || Number(rawAmount) <= 0) {
        alert('Masukkan nominal yang valid!');
        return;
    }

    const transactionIndex = transactions.findIndex(t => t.id === id);
    if (transactionIndex > -1) {
        transactions[transactionIndex] = {
            ...transactions[transactionIndex],
            description: editDescription.value,
            amount: Number(rawAmount),
            type: editType.value,
            category: editCategory.value,
        };
    }

    updateUI(); // Update UI after editing
    closeEditTransactionModal();
});

// --- Formatting ---
function setupNumericInput(formattedInput, hiddenInput) {
    formattedInput.addEventListener('input', function() {
        let val = this.value.replace(/[^,\d]/g, '').toString();
        let split = val.split(',');
        let sisa = split[0].length % 3;
        let rupiah = split[0].substr(0, sisa);
        let ribuan = split[0].substr(sisa).match(/\d{3}/gi);
        if (ribuan) { let separator = sisa ? '.' : ''; rupiah += separator + ribuan.join('.'); }
        this.value = rupiah;
        hiddenInput.value = val.replace(/\./g, '');
    });
}

setupNumericInput(amountFormattedInput, amountInput);
setupNumericInput(editAmountFormatted, editAmount);
setupNumericInput(targetInputFormatted, targetInput);


function formatRupiah(number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
}

// --- Charting ---
function initChart(income, expense) {
    const ctx = document.getElementById('financeChart').getContext('2d');
    const isDark = document.documentElement.classList.contains('dark');
    const labelColor = isDark ? '#e2e8f0' : '#334155';

    if (financeChart) {
        financeChart.data.datasets[0].data = [income, expense];
        financeChart.options.plugins.legend.labels.color = labelColor;
        financeChart.update();
        return;
    }

    financeChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Pemasukan', 'Pengeluaran'],
            datasets: [{
                data: [income, expense],
                backgroundColor: ['#f59e0b', '#ef4444'],
                borderWidth: 0,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { 
                    position: 'bottom', 
                    labels: { 
                        color: labelColor, 
                        font: { family: 'Plus Jakarta Sans', size: 12 } 
                    } 
                } 
            },
            cutout: '70%',
            animation: { animateScale: true, animateRotate: true }
        }
    });
}

// --- Core Application Logic ---
function updatePeriodSummary() {
    const period = periodSelector.value;
    const now = new Date();
    let inc = 0;
    let exp = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    transactions.forEach(t => {
        const tTime = new Date(t.timestamp);
        if (period === 'today') {
            if (tTime.toDateString() === today.toDateString()) {
                if (t.type === 'income') inc += t.amount; else exp += t.amount;
            }
        } else if (period === 'week') {
            const startOfWeek = new Date(today);
            startOfWeek.setDate(startOfWeek.getDate() - today.getDay());
            if (tTime >= startOfWeek) {
                if (t.type === 'income') inc += t.amount; else exp += t.amount;
            }
        } else if (period === 'month') {
            if (tTime.getMonth() === now.getMonth() && tTime.getFullYear() === now.getFullYear()) {
                if (t.type === 'income') inc += t.amount; else exp += t.amount;
            }
        }
    });

    periodIncomeEl.textContent = formatRupiah(inc);
    periodExpenseEl.textContent = formatRupiah(exp);
}

function updateUI() {
    let income = 0;
    let expense = 0;
    transactions.forEach(t => {
        if (t.type === 'income') income += t.amount; else expense += t.amount;
    });

    const balance = income - expense;
    totalBalanceEl.textContent = formatRupiah(balance);
    totalIncomeEl.textContent = formatRupiah(income);
    totalExpenseEl.textContent = formatRupiah(expense);

    if (savingsTarget > 0) {
        let percent = Math.min(Math.max((balance / savingsTarget) * 100, 0), 100);
        targetDisplay.textContent = `${formatRupiah(balance)} / ${formatRupiah(savingsTarget)} (${percent.toFixed(0)}%)`;
        targetProgressBar.style.width = `${percent}%`;
    } else {
        targetDisplay.textContent = 'Belum diset (Klik disini)';
        targetProgressBar.style.width = '0%';
    }

    updatePeriodSummary();
    renderTransactions(transactions);
    initChart(income, expense);
    localStorage.setItem('kasku_transactions', JSON.stringify(transactions));
}

function renderTransactions(data) {
    transactionListEl.innerHTML = '';
    if (data.length === 0) {
        transactionListEl.innerHTML = `<div class="text-center py-8 text-slate-500 dark:text-stone-500 text-sm animate-slide-up">Belum ada transaksi.</div>`;
        return;
    }

    const grouped = data.reduce((acc, t) => {
        if (!acc[t.date]) {
            acc[t.date] = { items: [], income: 0, expense: 0 };
        }
        acc[t.date].items.push(t);
        if (t.type === 'income') acc[t.date].income += t.amount;
        else acc[t.date].expense += t.amount;
        return acc;
    }, {});

    Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a)).forEach(date => {
        const group = grouped[date];
        const groupContainer = document.createElement('div');
        groupContainer.className = "bg-slate-50 dark:bg-stone-800/40 border border-slate-200 dark:border-stone-700/50 rounded-2xl p-3 space-y-2 animate-slide-up";

        const headerEl = document.createElement('div');
        headerEl.className = "flex justify-between items-center border-b border-slate-200 dark:border-stone-700/50 pb-2 mb-2";
        headerEl.innerHTML = `
            <span class="text-xs font-bold text-amber-600 dark:text-amber-400"><i class="fa-regular fa-calendar mr-1"></i> ${date}</span>
            <div class="flex gap-3 text-[11px] font-semibold">
                <span class="text-green-600 dark:text-amber-400">+${formatRupiah(group.income)}</span>
                <span class="text-red-600 dark:text-red-400">-${formatRupiah(group.expense)}</span>
            </div>
        `;
        groupContainer.appendChild(headerEl);

        const subList = document.createElement('div');
        subList.className = "space-y-2";
        group.items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).forEach(t => {
            const isIncome = t.type === 'income'; // Add animation classes here
            const itemEl = document.createElement('div');
            itemEl.className = "bg-white dark:bg-stone-900/60 border border-slate-100 dark:border-stone-800 p-2.5 rounded-xl flex items-center justify-between hover:bg-slate-50 dark:hover:bg-stone-900 transition";
            itemEl.innerHTML = `
                <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-lg flex items-center justify-center text-xs ${isIncome ? 'bg-green-100 text-green-600 dark:bg-amber-500/10 dark:text-amber-400' : 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400'}">
                        <i class="fa-solid ${isIncome ? 'fa-arrow-down-long' : 'fa-arrow-up-long'}"></i>
                    </div>
                    <div>
                        <h4 class="text-xs font-semibold text-slate-800 dark:text-white">${t.description}</h4>
                        <p class="text-[10px] text-slate-500 dark:text-stone-400">${t.category}</p>
                    </div>
                </div>
                <div class="flex items-center gap-2.5">
                    <span class="text-xs font-bold ${isIncome ? 'text-green-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}"> 
                        ${isIncome ? '+' : '-'} ${formatRupiah(t.amount)} 
                    </span> 
                    <button data-id="${t.id}" class="edit-transaction-btn text-slate-400 hover:text-sky-500 dark:text-stone-500 dark:hover:text-sky-400 transition text-xs p-1">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button data-id="${t.id}" class="delete-transaction-btn text-slate-400 hover:text-red-500 dark:text-stone-500 dark:hover:text-red-400 transition text-xs p-1">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            `;
            subList.appendChild(itemEl);

            // Add a subtle entrance animation for new items
            itemEl.style.opacity = '0';
            itemEl.style.transform = 'translateY(10px)';
            setTimeout(() => {
                itemEl.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
                itemEl.style.opacity = '1';
                itemEl.style.transform = 'translateY(0)';
            }, 50); // Small delay for staggered effect if multiple items
        });
        groupContainer.appendChild(subList);
        transactionListEl.appendChild(groupContainer);
    });
}

form.addEventListener('submit', (e) => {
    e.preventDefault();
    const rawAmount = Number(amountInput.value); // Fixed: remove redundant .replace(/\./g, '')
    if (!rawAmount || Number(rawAmount) <= 0) { alert('Masukkan nominal yang valid!'); return; }

    const now = new Date();
    const newTransaction = {
        id: Date.now().toString(),
        timestamp: now.toISOString(),
        description: descInput.value,
        amount: Number(rawAmount),
        type: typeInput.value,
        category: categoryInput.value,
        date: now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    };

    transactions.push(newTransaction);
    updateUI();
    form.reset();
    amountInput.value = ''; // Clear hidden input
});

function deleteTransaction(id) {
    const transactionToDelete = transactions.find(t => t.id === id);
    if (!transactionToDelete) return;

    // Find the actual DOM element for the transaction item
    const transactionElement = transactionListEl.querySelector(`[data-id="${id}"]`)?.closest('.bg-white');

    if (confirm(`Apakah Anda yakin ingin menghapus transaksi ini?\n\n"${transactionToDelete.description}" - ${formatRupiah(transactionToDelete.amount)}`)) {
        if (transactionElement) {
            // Add fade-out animation classes
            transactionElement.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
            transactionElement.style.opacity = '0';
            transactionElement.style.transform = 'translateX(-20px)';

            // Remove from DOM and update state after animation
            setTimeout(() => {
                transactionElement.remove(); // Remove the element from the DOM
                transactions = transactions.filter(t => t.id !== id); // Update the transactions array
                updateUI(); // Update UI after deletion
            }, 300); // Match transition duration
        } else {
            // Fallback if element not found (shouldn't happen if ID is correct)
            transactions = transactions.filter(t => t.id !== id);
            updateUI();
        }
        transactions = transactions.filter(t => t.id !== id);
        updateUI();
    }
}

function filterTransactions() { // Renamed from filterTransactions to handleFilterChange for consistency
    const filterValue = filterTypeEl.value;
    if (filterValue === 'all') renderTransactions(transactions);
    else renderTransactions(transactions.filter(t => t.type === filterValue));
}

function exportToExcel() {
    if (transactions.length === 0) { alert('Tidak ada data transaksi untuk diekspor!'); return; }
    const dataToExport = transactions.map((t, index) => ({
        No: index + 1,
        Tanggal: t.date,
        Keterangan: t.description,
        Kategori: t.category,
        Jenis: t.type === 'income' ? 'Uang Masuk' : 'Uang Keluar',
        Nominal: t.amount
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Keuangan");
    XLSX.writeFile(workbook, "Laporan_Keuangan_KasKu.xlsx");
}

// Function to populate categories dropdowns
function populateCategories(selectElement) {
    selectElement.innerHTML = ''; // Clear existing options
    TRANSACTION_CATEGORIES.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.value;
        option.textContent = cat.label;
        selectElement.appendChild(option);
    });
}

// Initial Load
walletTitleDisplay.textContent = walletName;
if (quickNotes) notesPreview.textContent = quickNotes;

// Populate categories dropdowns
populateCategories(categoryInput);
populateCategories(editCategory);

// --- Event Listeners ---
editWalletNameButton.addEventListener('click', openEditWalletModal);
exportExcelButton.addEventListener('click', exportToExcel);
openTargetModalButton.addEventListener('click', openTargetModal);
openNotesModalButton.addEventListener('click', openNotesModal);
openResetModalButton.addEventListener('click', openResetModal);

// Modal buttons
closeWalletModalButton.addEventListener('click', closeEditWalletModal);
saveWalletNameButton.addEventListener('click', saveWalletName);
closeTargetModalButton.addEventListener('click', closeTargetModal);
saveTargetButton.addEventListener('click', saveTarget);
closeNotesModalButton.addEventListener('click', closeNotesModal);
saveNotesButton.addEventListener('click', saveNotes);
document.getElementById('close-reset-modal-button').addEventListener('click', closeResetModal); // Using getElementById directly as it's a single use
document.getElementById('execute-reset-data-button').addEventListener('click', executeResetData); // Using getElementById directly as it's a single use
closeEditTransactionModalButton.addEventListener('click', closeEditTransactionModal);

openBackupRestoreModalButton.addEventListener('click', openBackupRestoreModal);
closeBackupRestoreModalButton.addEventListener('click', closeBackupRestoreModal);
saveBackupButton.addEventListener('click', saveBackup);
restoreBackupButton.addEventListener('click', restoreBackup);

periodSelector.addEventListener('change', updatePeriodSummary);
filterTypeEl.addEventListener('change', filterTransactions);

// Event delegation for dynamically created transaction buttons
transactionListEl.addEventListener('click', (e) => {
    const target = e.target;
    const editButton = target.closest('.edit-transaction-btn');
    const deleteButton = target.closest('.delete-transaction-btn');

    if (editButton) {
        const transactionId = editButton.dataset.id;
        openEditTransactionModal(transactionId);
    } else if (deleteButton) {
        const transactionId = deleteButton.dataset.id;
        deleteTransaction(transactionId);
    }
});

updateUI();
