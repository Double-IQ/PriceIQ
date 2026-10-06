const factors = { mg:0.001, g:1, kg:1000, ml:1, l:1000, unit:1, m:1, cm:0.01 };
const labels = { mg:"mg", g:"grams", kg:"kg", ml:"ml", l:"litre", unit:"unit", m:"metre", cm:"cm" };
const families = {
  mg:"mass", g:"mass", kg:"mass",
  ml:"volume", l:"volume",
  unit:"count",
  m:"length", cm:"length"
};
const familyBases = {
  mass:"g",
  volume:"ml",
  count:"unit",
  length:"m"
};
const familySuggestions = {
  mass:"Choose mg, g or kg for both products.",
  volume:"Choose ml or litre for both products.",
  count:"Choose unit for both products.",
  length:"Choose cm or metre for both products."
};

const $ = id => document.getElementById(id);
let basis = "kg";
let basisManuallyChanged = false;

function cleanName(value, fallback) {
  return value.trim() || fallback;
}

function money(value) {
  const currency = ($("currency").value.trim() || "R");
  if (!Number.isFinite(value)) return "—";
  return currency + Number(value).toLocaleString("en-ZA", {
    minimumFractionDigits: value < 10 && value !== 0 ? 2 : 0,
    maximumFractionDigits: 2
  });
}

function quantity(value) {
  return Number(value).toLocaleString("en-ZA", { maximumFractionDigits: 4 });
}

function setBasis(nextBasis, manual = false) {
  if (!factors[nextBasis]) return;
  basis = nextBasis;
  if (manual) basisManuallyChanged = true;
  document.querySelectorAll("[data-basis]").forEach(button => {
    button.classList.toggle("active", button.dataset.basis === basis);
  });
}

function autoSelectBasis(firstUnit) {
  if (basisManuallyChanged) return;
  const family = families[firstUnit];
  setBasis(familyBases[family]);
}

function syncProductBUnits() {
  const family = families[$("unit-a").value];
  const select = $("unit-b");
  const currentFamily = families[select.value];

  Array.from(select.options).forEach(option => {
    option.hidden = families[option.value] !== family;
  });

  if (currentFamily !== family) {
    const replacement = Object.keys(families).find(unit => families[unit] === family);
    if (replacement) select.value = replacement;
  }
}

function showWarning(message) {
  $("pc-warning").innerHTML = '<strong>These products cannot be compared directly.</strong><p>' + message + "</p>";
  $("pc-warning").hidden = false;
}

function hideWarning() {
  $("pc-warning").hidden = true;
  $("pc-warning").textContent = "";
}

function calculate() {
  const a = {
    name: cleanName($("name-a").value, "Product A"),
    qty: Number($("quantity-a").value),
    unit: $("unit-a").value,
    price: Number($("price-a").value)
  };
  const b = {
    name: cleanName($("name-b").value, "Product B"),
    qty: Number($("quantity-b").value),
    unit: $("unit-b").value,
    price: Number($("price-b").value)
  };

  $("currency-preview-a").textContent = $("currency").value.trim() || "R";
  $("currency-preview-b").textContent = $("currency").value.trim() || "R";

  const valid = [a,b].every(p => Number.isFinite(p.qty) && p.qty > 0 && Number.isFinite(p.price) && p.price >= 0);
  if (!valid) {
    hideWarning();
    $("pc-primary").textContent = "Enter valid quantities and prices";
    $("pc-sub").textContent = "";
    $("pc-highlight").textContent = "";
    $("pc-detail").textContent = "";
    $("pc-primary").className = "pc-big error";
    return;
  }
  $("pc-primary").className = "pc-big";

  if (families[a.unit] !== families[b.unit]) {
    syncProductBUnits();
    b.unit = $("unit-b").value;
  }

  if (families[a.unit] !== families[b.unit]) {
    $("pc-primary").textContent = "Comparison not available";
    $("pc-sub").textContent = a.name + ": " + labels[a.unit] + " • " + b.name + ": " + labels[b.unit];
    $("pc-highlight").textContent = "Select compatible units to compare prices";
    $("pc-detail").textContent = "";
    return;
  }

  const basisFamily = families[basis];
  const productFamily = families[a.unit];
  if (basisFamily !== productFamily) {
    showWarning(
      "The comparison basis is " + labels[basis] + ", but these products are measured in " +
      familyLabel(productFamily) + ". " + familySuggestions[productFamily] +
      " Choose a compatible comparison unit, or change Product A and Product B to the same unit family."
    );
    $("pc-primary").textContent = "Comparison basis is not compatible";
    $("pc-sub").textContent = a.name + ": " + labels[a.unit] + " • " + b.name + ": " + labels[b.unit];
    $("pc-highlight").textContent = "Choose a " + familyLabel(productFamily) + " comparison unit";
    $("pc-detail").textContent = "";
    return;
  }

  hideWarning();

  const baseFactor = factors[basis];
  const aNormalizedQty = a.qty * factors[a.unit] / baseFactor;
  const bNormalizedQty = b.qty * factors[b.unit] / baseFactor;
  const aUnitPrice = a.price / aNormalizedQty;
  const bUnitPrice = b.price / bNormalizedQty;

  let cheap, expensive, cheapPrice, expensivePrice, cheapQty, totalSaving, percent;

  if (aUnitPrice < bUnitPrice) {
    cheap = a; expensive = b;
    cheapPrice = aUnitPrice; expensivePrice = bUnitPrice;
    cheapQty = aNormalizedQty;
  } else if (bUnitPrice < aUnitPrice) {
    cheap = b; expensive = a;
    cheapPrice = bUnitPrice; expensivePrice = aUnitPrice;
    cheapQty = bNormalizedQty;
  }

  $("pc-sub").textContent =
    a.name + ": " + money(aUnitPrice) + " per " + labels[basis] +
    " • " + b.name + ": " + money(bUnitPrice) + " per " + labels[basis];

  if (!cheap) {
    $("pc-primary").textContent = "Both cost the same";
    $("pc-highlight").textContent = "0% cheaper • R0 saving per " + labels[basis];
    $("pc-detail").innerHTML = '<div class="detail-item"><span class="detail-label">Total saving</span><span class="detail-value">' + money(0) + "</span></div>";
    return;
  }

  percent = expensivePrice === 0 ? 0 : ((expensivePrice - cheapPrice) / expensivePrice) * 100;
  const savingPerUnit = expensivePrice - cheapPrice;
  totalSaving = (expensivePrice * cheapQty) - cheap.price;
  if (totalSaving < 0 && totalSaving > -0.000001) totalSaving = 0;

  $("pc-primary").textContent = cheap.name + " is cheaper";
  $("pc-highlight").textContent =
    cheap.name + " is " + percent.toFixed(1) + "% cheaper than " + expensive.name;

  $("pc-detail").innerHTML =
    '<div class="detail-item"><span class="detail-label">Saving per ' + labels[basis] + '</span><span class="detail-value">' + money(savingPerUnit) + "</span></div>" +
    '<div class="detail-item"><span class="detail-label">Total saving on ' + quantity(cheapQty) + " " + labels[basis] + '</span><span class="detail-value">' + money(totalSaving) + "</span></div>";
}

function familyLabel(family) {
  return {
    mass:"mass units",
    volume:"volume units",
    count:"unit counts",
    length:"length units"
  }[family];
}

document.querySelectorAll("[data-basis]").forEach(button => {
  button.addEventListener("click", () => {
    setBasis(button.dataset.basis, true);
    calculate();
  });
});

document.querySelectorAll("input, select").forEach(control => {
  control.addEventListener("input", calculate);
  control.addEventListener("change", () => {
    if (control.id === "unit-a") {
      syncProductBUnits();
      if (!basisManuallyChanged) autoSelectBasis(control.value);
    }
    calculate();
  });
});

syncProductBUnits();
autoSelectBasis($("unit-a").value);
calculate();