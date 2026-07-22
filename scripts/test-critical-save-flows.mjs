import test from "node:test";
import assert from "node:assert/strict";

const base = (process.env.CRITICAL_FLOWS_BASE_URL ?? "").replace(/\/$/, "");

async function request(path, init) {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  assert.ok(response.ok, `${init?.method ?? "GET"} ${path} failed: ${response.status} ${JSON.stringify(body)}`);
  return body;
}

test("critical recipe and grocery save flows", { skip: !base }, async () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const recipeName = `Critical flow recipe ${suffix}`;
  const listName = `Critical flow list ${suffix}`;
  let recipe;
  let list;
  let mainItem;
  try {
    const state = await request("/api/state");
    assert.ok(Array.isArray(state.mealRecipes));
    assert.ok(Array.isArray(state.groceryLists));

    recipe = await request("/api/meal-recipes", {
      method: "POST",
      body: JSON.stringify({ name: recipeName, ingredients: [{ name: "Test tomato", quantity: "1" }] }),
    });
    await request(`/api/meal-recipes/${recipe.id}`, {
      method: "PUT",
      body: JSON.stringify({ name: `${recipeName} edited`, ingredients: [{ name: "Test tomato", quantity: "2" }] }),
    });

    list = await request("/api/grocery-lists", {
      method: "POST",
      body: JSON.stringify({ name: listName, emoji: "🛒" }),
    });
    await request(`/api/grocery-lists/${list.id}`, {
      method: "PUT",
      body: JSON.stringify({ name: `${listName} edited` }),
    });
    mainItem = await request("/api/grocery-main-items", {
      method: "POST",
      body: JSON.stringify({ name: `Critical item ${suffix}` }),
    });
    await request(`/api/grocery-main-items/${mainItem.id}`, {
      method: "PUT",
      body: JSON.stringify({ checked: true }),
    });
  } finally {
    if (mainItem?.id) await request(`/api/grocery-main-items/${mainItem.id}`, { method: "DELETE" }).catch(() => undefined);
    if (list?.id) await request(`/api/grocery-lists/${list.id}`, { method: "DELETE" }).catch(() => undefined);
    if (recipe?.id) await request(`/api/meal-recipes/${recipe.id}`, { method: "DELETE" }).catch(() => undefined);
  }
});

if (!base) console.warn("Critical save-flow smoke test skipped: set CRITICAL_FLOWS_BASE_URL to a running Nitro app.");
