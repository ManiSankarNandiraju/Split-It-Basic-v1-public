let members = [];
let expenses = [];

async function fetchMembers() {
  const response = await fetch('/members');
  members = await response.json();
  updateMembersUI();
  fetchExpenses(); // Fetch and update the expenses table after members are loaded
}

async function fetchExpenses() {
  const response = await fetch('/expenses');
  const expenses = await response.json();
  updateExpensesTable(expenses);
}

function updateMembersUI() {
  const membersList = document.getElementById('membersList');
  membersList.innerHTML = members.map((m, index) => `
    <li>
      ${m.name}: Balance ${m.balance.toFixed(2)}
      <button onclick="removeMember('${m.name}', ${index})">Remove</button>
    </li>
  `).join('');

  const paidBySelect = document.getElementById('paidBy');
  const settleFromSelect = document.getElementById('settleFrom');
  const settleToSelect = document.getElementById('settleTo');

  const options = members.map(m => `<option value="${m.name}">${m.name}</option>`).join('');
  paidBySelect.innerHTML = options;
  settleFromSelect.innerHTML = options;
  settleToSelect.innerHTML = options;

  updateOweList();
}


async function removeMember(name, index) {
  const confirmation = confirm(`Are you sure you want to remove ${name}?`);
  if (!confirmation) return;

  const response = await fetch(`/members/${name}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });

  if (response.ok) {
    alert(`${name} has been removed.`);
    fetchMembers(); // Reload members after removal
  } else {
    alert('Error removing member.');
  }
}


function updateOweList() {
  const oweList = document.getElementById('oweList');
  oweList.innerHTML = '';
  // Calculate net balances
  const balances = {};
  members.forEach(member => {
    balances[member.name] = member.balance || 0;
  });

  // Create lists of creditors and debtors
  const creditors = [];
  const debtors = [];

  for (const [name, balance] of Object.entries(balances)) {
    if (balance > 0) {
      creditors.push({ name, amount: balance });
    } else if (balance < 0) {
      debtors.push({ name, amount: Math.abs(balance) });
    }
  }

  // Match debtors with creditors
  while (debtors.length > 0 && creditors.length > 0) {
    const debtor = debtors[0];
    const creditor = creditors[0];

    const settlementAmount = Math.min(debtor.amount, creditor.amount);

    // Add dynamically styled owe statements     // Add to owe list
    const listItem = document.createElement('li');
    listItem.innerHTML = `${debtor.name} owes ${creditor.name} ${settlementAmount.toFixed(2)}`;
    listItem.className = 'negative'; // Owe statements are styled as negative
    oweList.appendChild(listItem);

    // Adjust balances
    debtor.amount -= settlementAmount;
    creditor.amount -= settlementAmount;

    // Remove fully settled entries
    if (debtor.amount === 0) debtors.shift();
    if (creditor.amount === 0) creditors.shift();
  }
}

async function addMember() {
  const name = document.getElementById('memberName').value;
  if (!name) return alert('Please enter a name.');

  const response = await fetch('/members', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (response.ok) {
    fetchMembers();
  } else {
    alert('Error adding member.');
  }
}

function handleSplitTypeChange() {
  const splitType = document.getElementById('splitType').value;
  const splitDetails = document.getElementById('splitDetails');
  splitDetails.innerHTML = '';

  if (splitType === 'equal') {
    members.forEach(member => {
      splitDetails.innerHTML += `
        <label>
          <input type="checkbox" name="members" value="${member.name}" checked> ${member.name}
        </label><br>
      `;
    });
  } else if (splitType === 'unequal') {
    members.forEach(member => {
      splitDetails.innerHTML += `
        <label>
          <input type="checkbox" name="members" value="${member.name}">
          ${member.name}
          <input type="number" class="splitAmount" placeholder="Amount" disabled>
        </label><br>
      `;
    });

    document.querySelectorAll('input[name="members"]').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const amountInput = e.target.nextElementSibling;
        amountInput.disabled = !e.target.checked;
      });
    });
  }
}

async function addExpense() {
  const description = document.getElementById('description').value;
  const totalAmount = parseFloat(document.getElementById('totalAmount').value);
  const paidBy = document.getElementById('paidBy').value;
  const splitType = document.getElementById('splitType').value;

  let membersData = [];
  if (splitType === 'equal') {
    const selectedMembers = Array.from(document.querySelectorAll('input[name="members"]:checked')).map(cb => cb.value);
    const splitAmount = totalAmount / selectedMembers.length;
    membersData = selectedMembers.map(name => ({ member: name, amount: splitAmount }));
  } else if (splitType === 'unequal') {
    const inputs = document.querySelectorAll('input[name="members"]:checked');
    inputs.forEach(input => {
      const amount = parseFloat(input.nextElementSibling.value);
      membersData.push({ member: input.value, amount });
    });
  }

  await fetch('/expenses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description, totalAmount, paidBy, members: membersData }),
  });

  fetchMembers();
}

async function settleUp() {
  const from = document.getElementById('settleFrom').value;
  const to = document.getElementById('settleTo').value;
  const amount = parseFloat(document.getElementById('settleAmount').value);

  await fetch('/settle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, amount }),
  });

  fetchMembers();
}

function updateExpensesTable(expenses) {
  const tableBody = document.getElementById('expensesTable').querySelector('tbody');
  tableBody.innerHTML = '';

  expenses.forEach(expense => {
    const splitDetails = expense.members
      .map(member => `${member.member}: ${member.amount.toFixed(2)}`)
      .join(', ');

    const row = `
      <tr>
        <td>${expense.description}</td>
        <td>${expense.paidBy}</td>
        <td>${expense.totalAmount.toFixed(2)}</td>
        <td>${splitDetails}</td>
      </tr>
    `;

    tableBody.innerHTML += row;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  fetchMembers().then(() => {
    handleSplitTypeChange(); // Ensure checkboxes are displayed initially
  });
});
