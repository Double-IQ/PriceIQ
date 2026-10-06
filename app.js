const factors = { mg:0.001, g:1, kg:1000, ml:1, l:1000, unit:1, m:1, cm:0.01 };
const labels = { mg:"mg", g:"g", kg:"kg", ml:"ml", l:"litre", unit:"unit", m:"m", cm:"cm" };

const $ = id => document.getElementById(id);
let basis = "kg";

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
    $("pc-primary").textContent = "Enter valid quantities and prices";
    $("pc-sub").textContent = "";
    $("pc-highlight").textContent = "";
    $("pc-detail").textContent = "";
    $("pc-primary").className = "pc-big error";
    return;
  }
  $("pc-primary").className = "pc-big";

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

  // Compare buying the cheaper product's original quantity at the expensive product's normalized price.
  totalSaving = (expensivePrice * cheapQty) - cheap.price;
  if (totalSaving < 0 && totalSaving > -0.000001) totalSaving = 0;

  $("pc-primary").textContent = cheap.name + " is cheaper";
  $("pc-highlight").textContent =
    cheap.name + " is " + percent.toFixed(1) + "% cheaper than " + expensive.name;

  $("pc-detail").innerHTML =
    '<div class="detail-item"><span class="detail-label">Saving per ' + labels[basis] + '</span><span class="detail-value">' + money(savingPerUnit) + "</span></div>" +
    '<div class="detail-item"><span class="detail-label">Total saving on ' + quantity(cheapQty) + " " + labels[basis] + '</span><span class="detail-value">' + money(totalSaving) + "</span></div>";
}

document.querySelectorAll("[data-basis]").forEach(button => {
  button.addEventListener("click", () => {
    basis = button.dataset.basis;
    document.querySelectorAll("[data-basis]").forEach(b => b.classList.toggle("active", b === button));
    calculate();
  });
});

document.querySelectorAll("input, select").forEach(control => {
  control.addEventListener("input", calculate);
  control.addEventListener("change", calculate);
});

calculate();