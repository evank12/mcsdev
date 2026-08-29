(() => {
  "use strict";

  const ADMIN_PANEL_ID = "mcs-admin-panel";
  const TOGGLE_ID = "mcs-admin-toggle";
  const MAX_QUANTITY = 999;
  let cases = [];

  const callGameFunction = async (name, ...params) => {
    if (typeof window.c3_callFunction !== "function") {
      throw new Error("The game runtime is still loading. Try again in a moment.");
    }

    return window.c3_callFunction(name, params);
  };

  const formatItemName = (name) => name.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const getSelectedItem = () => {
    const select = document.getElementById("mcs-admin-item");
    const [caseIndex, itemIndex] = select.value.split(":").map(Number);
    return { caseIndex, itemIndex, item: cases[caseIndex].items[itemIndex] };
  };

  const showStatus = (message, isError = false) => {
    const status = document.getElementById("mcs-admin-status");
    status.textContent = message;
    status.classList.toggle("is-error", isError);
  };

  const populateItems = () => {
    const select = document.getElementById("mcs-admin-item");
    select.innerHTML = "";

    cases.forEach((caseData, caseIndex) => {
      const group = document.createElement("optgroup");
      group.label = formatItemName(caseData.name || `Case ${caseIndex + 1}`);

      caseData.items.forEach((item, itemIndex) => {
        const option = document.createElement("option");
        option.value = `${caseIndex}:${itemIndex}`;
        option.textContent = `${formatItemName(item.name)} (${formatItemName(caseData.name)})`;
        group.appendChild(option);
      });

      select.appendChild(group);
    });
  };

  const spawnSelectedItem = async () => {
    const quantityInput = document.getElementById("mcs-admin-quantity");
    const durabilityInput = document.getElementById("mcs-admin-durability");
    const quantity = Math.max(1, Math.min(MAX_QUANTITY, Math.floor(Number(quantityInput.value) || 1)));
    const durability = Math.max(0, Math.min(1, Number(durabilityInput.value) / 100));
    const { caseIndex, itemIndex, item } = getSelectedItem();

    for (let i = 0; i < quantity; i += 1) {
      await callGameFunction("AddItemToInventory", caseIndex, itemIndex, durability);
    }

    await callGameFunction("SaveGame");
    await refreshInventoryUI();
    showStatus(`Added ${quantity} × ${formatItemName(item.name)} to your inventory.`);
  };

  const addMoney = async () => {
    const moneyInput = document.getElementById("mcs-admin-money");
    const amount = Math.max(0, Math.floor(Number(moneyInput.value) || 0));
    await callGameFunction("SetBalance", amount);
    await callGameFunction("SaveGame");
    showStatus(`Set your money balance to $${amount.toLocaleString()}.`);
  };

  const refreshInventoryUI = async () => {
    const optionalFunctions = ["SetupInventoryItems", "UpdateInventoryItemCountText"];
    for (const functionName of optionalFunctions) {
      try {
        await callGameFunction(functionName);
      } catch (error) {
        // These UI helpers only exist on the inventory layout, so it is safe to ignore failures elsewhere.
      }
    }
  };

  const createPanel = () => {
    const toggle = document.createElement("button");
    toggle.id = TOGGLE_ID;
    toggle.type = "button";
    toggle.textContent = "Admin";
    toggle.setAttribute("aria-controls", ADMIN_PANEL_ID);
    toggle.setAttribute("aria-expanded", "false");

    const panel = document.createElement("aside");
    panel.id = ADMIN_PANEL_ID;
    panel.setAttribute("aria-label", "Admin panel");
    panel.innerHTML = `
      <div class="mcs-admin-header">
        <h2>Admin Panel</h2>
        <button type="button" id="mcs-admin-close" aria-label="Close admin panel">×</button>
      </div>
      <label>Item<select id="mcs-admin-item"></select></label>
      <div class="mcs-admin-row">
        <label>Quantity<input id="mcs-admin-quantity" type="number" min="1" max="${MAX_QUANTITY}" value="1" /></label>
        <label>Durability %<input id="mcs-admin-durability" type="number" min="0" max="100" value="100" /></label>
      </div>
      <button type="button" id="mcs-admin-spawn">Spawn item(s)</button>
      <label>Money balance<input id="mcs-admin-money" type="number" min="0" step="1" value="100000" /></label>
      <button type="button" id="mcs-admin-add-money">Set money</button>
      <p id="mcs-admin-status" role="status">Pick an item or set a money amount.</p>
    `;

    document.body.append(toggle, panel);
    populateItems();

    const setOpen = (open) => {
      panel.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
    };

    toggle.addEventListener("click", () => setOpen(!panel.classList.contains("is-open")));
    document.getElementById("mcs-admin-close").addEventListener("click", () => setOpen(false));
    document.getElementById("mcs-admin-spawn").addEventListener("click", () => spawnSelectedItem().catch((error) => showStatus(error.message, true)));
    document.getElementById("mcs-admin-add-money").addEventListener("click", () => addMoney().catch((error) => showStatus(error.message, true)));
  };

  const init = async () => {
    if (document.getElementById(ADMIN_PANEL_ID)) {
      return;
    }

    const response = await fetch("cases.json");
    cases = await response.json();
    createPanel();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => init().catch(console.error));
  } else {
    init().catch(console.error);
  }
})();
