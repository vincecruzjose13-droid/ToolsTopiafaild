// SINGLE script for all pages. It attaches handlers only for elements that exist on the current page.
// Requires firebase-config.js to be loaded first and compat libs to be present in HTML.

document.addEventListener("DOMContentLoaded", () => {

  // --- COMMON UI elements ---
  const logoutButtons = document.querySelectorAll("#logoutBtn");
  logoutButtons.forEach(btn => btn.addEventListener("click", () => {
    auth.signOut().then(()=> window.location = "login.html");
  }));

  // Protect pages: if user not logged in -> redirect to login (except login.html & index.html)
  const path = location.pathname.split("/").pop();
  const publicPages = ["login.html", "index.html"];
  auth.onAuthStateChanged(user => {
    if (!user && !publicPages.includes(path)) {
      window.location = "login.html";
      return;
    }
    // if on dashboard, show welcome info
    if (user && path === "dashboard.html") {
      document.getElementById("welcomeMsg").textContent = `Hello, ${user.email}`;
      // load stats
      loadQuickStats(user.uid);
    }
  });

  // ------------- LOGIN / SIGNUP (login.html) -------------
  const loginBtn = document.getElementById("loginBtn");
  const signupBtn = document.getElementById("signupBtn");
  const emailInput = document.getElementById("emailInput");
  const passwordInput = document.getElementById("passwordInput");
  const loginError = document.getElementById("loginError");

  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      const email = emailInput.value.trim();
      const pass = passwordInput.value.trim();
      loginError.textContent = "";
      if (!email || !pass) return loginError.textContent = "Email and password required.";
      auth.signInWithEmailAndPassword(email, pass)
        .then(() => { window.location = "dashboard.html"; })
        .catch(e => loginError.textContent = e.message);
    });
  }

  if (signupBtn) {
    signupBtn.addEventListener("click", () => {
      const email = emailInput.value.trim();
      const pass = passwordInput.value.trim();
      loginError.textContent = "";
      if (!email || !pass) return loginError.textContent = "Email and password required.";
      auth.createUserWithEmailAndPassword(email, pass)
        .then(() => { window.location = "dashboard.html"; })
        .catch(e => loginError.textContent = e.message);
    });
  }

  // ------------- INVENTORY PAGE -------------
  const addItemBtn = document.getElementById("addItemBtn");
  if (addItemBtn) {
    addItemBtn.addEventListener("click", () => {
      const name = document.getElementById("itemName").value.trim();
      const qty = parseInt(document.getElementById("itemQty").value || "1", 10);
      if (!name) return alert("Enter item name");
      const user = auth.currentUser;
      if (!user) return window.location = "login.html";
      const ref = db.ref("users/" + user.uid + "/inventory");
      const key = ref.push().key;
      ref.child(key).set({ id: key, name, qty }).then(() => {
        document.getElementById("itemName").value = "";
        document.getElementById("itemQty").value = "";
      });
    });

    // live listener
    auth.onAuthStateChanged(user => {
      if (!user) return;
      const ref = db.ref("users/" + user.uid + "/inventory");
      ref.off();
      ref.on("value", snap => {
        const list = document.getElementById("inventoryList");
        const val = snap.val() || {};
        const arr = Object.values(val);
        list.innerHTML = arr.length ? arr.map(it => `
          <div class="item">
            <div><strong>${escapeHtml(it.name)}</strong><div class="small muted">Qty: ${it.qty}</div></div>
            <div>
              <button class="secondary small" onclick="editItem('${it.id}')">Edit</button>
              <button class="secondary small" onclick="changeQty('${it.id}',1)">+1</button>
              <button class="secondary small" onclick="changeQty('${it.id}',-1)">-1</button>
              <button class="secondary small" onclick="deleteItem('${it.id}')">Delete</button>
            </div>
          </div>
        `).join("") : '<div class="small muted">No items yet</div>';
      });
    });
  }

  // ------------- BORROW PAGE -------------
  const addBorrowBtn = document.getElementById("addBorrowBtn");
  if (addBorrowBtn) {
    addBorrowBtn.addEventListener("click", () => {
      const tool = document.getElementById("borrowItem").value.trim();
      const person = document.getElementById("borrowPerson").value.trim();
      const due = document.getElementById("borrowDue").value || "";
      if (!tool || !person) return alert("Enter tool and borrower");
      const user = auth.currentUser;
      if (!user) return window.location = "login.html";
      const ref = db.ref("users/" + user.uid + "/borrow");
      const key = ref.push().key;
      ref.child(key).set({ id: key, tool, person, due, returned: false }).then(() => {
        document.getElementById("borrowItem").value = "";
        document.getElementById("borrowPerson").value = "";
        document.getElementById("borrowDue").value = "";
      });
    });

    auth.onAuthStateChanged(user => {
      if (!user) return;
      const ref = db.ref("users/" + user.uid + "/borrow");
      ref.off();
      ref.on("value", snap => {
        const list = document.getElementById("borrowList");
        const val = snap.val() || {};
        const arr = Object.values(val);
        list.innerHTML = arr.length ? arr.map(b => `
          <div class="item">
            <div><strong>${escapeHtml(b.tool)}</strong><div class="small muted">${escapeHtml(b.person)} ${b.due? '• Due ' + b.due : ''}</div></div>
            <div>
              <button class="secondary small" onclick="toggleReturned('${b.id}')">${b.returned? 'Undo':'Returned'}</button>
              <button class="secondary small" onclick="deleteBorrow('${b.id}')">Delete</button>
            </div>
          </div>
        `).join("") : '<div class="small muted">No borrow records</div>';
      });
    });
  }

  // ------------- TASKS PAGE -------------
  const addTaskBtn = document.getElementById("addTaskBtn");
  if (addTaskBtn) {
    addTaskBtn.addEventListener("click", () => {
      const text = document.getElementById("taskText").value.trim();
      const pr = document.getElementById("taskPriority").value;
      if (!text) return alert("Enter task");
      const user = auth.currentUser;
      if (!user) return window.location = "login.html";
      const ref = db.ref("users/" + user.uid + "/tasks");
      const key = ref.push().key;
      ref.child(key).set({ id: key, text, priority: pr, done: false }).then(()=>{
        document.getElementById("taskText").value = "";
      });
    });

    auth.onAuthStateChanged(user => {
      if (!user) return;
      const ref = db.ref("users/" + user.uid + "/tasks");
      ref.off();
      ref.on("value", snap => {
        const list = document.getElementById("tasksList");
        const val = snap.val() || {};
        const arr = Object.values(val);
        list.innerHTML = arr.length ? arr.map(t => `
          <div class="item">
            <div><strong>${escapeHtml(t.text)}</strong><div class="small muted">${escapeHtml(t.priority)}</div></div>
            <div>
              <button class="secondary small" onclick="toggleTask('${t.id}')">${t.done? 'Undo':'Done'}</button>
              <button class="secondary small" onclick="deleteTask('${t.id}')">Delete</button>
            </div>
          </div>
        `).join("") : '<div class="small muted">No tasks</div>';
      });
    });
  }

  // ------------- Helper functions available globally -------------
  window.editItem = async function(id){
    const user = auth.currentUser; if(!user) return;
    const newName = prompt("Edit name");
    if(!newName) return;
    await db.ref("users/" + user.uid + "/inventory/" + id).update({ name: newName });
  };

  window.changeQty = async function(id,delta){
    const user = auth.currentUser; if(!user) return;
    const ref = db.ref("users/" + user.uid + "/inventory/" + id);
    const snap = await ref.get();
    if(!snap.exists()) return;
    const newQty = Math.max(0, (snap.val().qty||0) + delta);
    await ref.update({ qty: newQty });
  };

  window.deleteItem = async function(id){
    if(!confirm("Delete item?")) return;
    const user = auth.currentUser; if(!user) return;
    await db.ref("users/" + user.uid + "/inventory/" + id).remove();
  };

  window.toggleReturned = async function(id){
    const user = auth.currentUser; if(!user) return;
    const ref = db.ref("users/" + user.uid + "/borrow/" + id);
    const snap = await ref.get();
    if(!snap.exists()) return;
    await ref.update({ returned: !snap.val().returned });
  };

  window.deleteBorrow = async function(id){
    if(!confirm("Delete record?")) return;
    const user = auth.currentUser; if(!user) return;
    await db.ref("users/" + user.uid + "/borrow/" + id).remove();
  };

  window.toggleTask = async function(id){
    const user = auth.currentUser; if(!user) return;
    const ref = db.ref("users/" + user.uid + "/tasks/" + id);
    const snap = await ref.get();
    if(!snap.exists()) return;
    await ref.update({ done: !snap.val().done });
  };

  window.deleteTask = async function(id){
    if(!confirm("Delete task?")) return;
    const user = auth.currentUser; if(!user) return;
    await db.ref("users/" + user.uid + "/tasks/" + id).remove();
  };

  // Utility to update quick stats on dashboard
  async function loadQuickStats(uid){
    const invSnap = await db.ref("users/" + uid + "/inventory").get();
    const borSnap = await db.ref("users/" + uid + "/borrow").get();
    const taskSnap = await db.ref("users/" + uid + "/tasks").get();
    document.getElementById("statItems").textContent = invSnap.exists() ? Object.keys(invSnap.val()).length : 0;
    document.getElementById("statBorrowed").textContent = borSnap.exists() ? Object.keys(borSnap.val()).length : 0;
    document.getElementById("statTasks").textContent = taskSnap.exists() ? Object.keys(taskSnap.val()).length : 0;
  }

  // simple safe escape
  function escapeHtml(s){ return (s||"").toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

});
