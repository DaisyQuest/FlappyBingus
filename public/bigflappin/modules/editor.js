import { VALUE_TYPES, inferValueType, createDefaultValue, coerceValue, normalizeKey } from "./editorModel.js";

function createElement(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

class PrimitiveNode {
  constructor(value, label) {
    this.label = label;
    this.type = inferValueType(value);
    this.value = value;
    this.element = createElement("div", "editor-row");
    const labelEl = createElement("label", null, label);
    this.input = this.buildInput();
    this.element.append(labelEl, this.input);
  }

  buildInput() {
    if (this.type === VALUE_TYPES.boolean) {
      const wrapper = createElement("div");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = Boolean(this.value);
      wrapper.appendChild(checkbox);
      this.checkbox = checkbox;
      return wrapper;
    }
    if (this.type === VALUE_TYPES.number) {
      const input = document.createElement("input");
      input.type = "number";
      input.value = Number.isFinite(this.value) ? String(this.value) : "0";
      return input;
    }
    const input = document.createElement("input");
    input.type = "text";
    input.value = this.value === null || this.value === undefined ? "" : String(this.value);
    return input;
  }

  getValue() {
    if (this.type === VALUE_TYPES.boolean) return Boolean(this.checkbox.checked);
    if (this.type === VALUE_TYPES.number) return coerceValue(VALUE_TYPES.number, this.input.value);
    if (this.type === VALUE_TYPES.null) return null;
    return String(this.input.value);
  }
}

class ObjectNode {
  constructor(value, label) {
    this.label = label;
    this.value = value && typeof value === "object" ? value : {};
    this.children = new Map();
    this.element = createElement("div", "editor-node");
    this.details = createElement("details");
    this.details.open = true;
    const summary = createElement("summary", null, `${label} · Object`);
    this.details.appendChild(summary);

    const body = createElement("div");
    this.body = body;
    this.details.appendChild(body);
    this.element.appendChild(this.details);

    Object.entries(this.value).forEach(([key, entry]) => {
      this.addChild(key, entry);
    });

    this.addControls();
  }

  addControls() {
    const addRow = createElement("div", "editor-row");
    const keyInput = document.createElement("input");
    keyInput.placeholder = "New field key";
    const typeSelect = document.createElement("select");
    [VALUE_TYPES.string, VALUE_TYPES.number, VALUE_TYPES.boolean, VALUE_TYPES.object, VALUE_TYPES.array, VALUE_TYPES.null]
      .forEach((type) => {
        const opt = document.createElement("option");
        opt.value = type;
        opt.textContent = type;
        typeSelect.appendChild(opt);
      });
    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.textContent = "Add field";
    addBtn.className = "ghost";
    addBtn.addEventListener("click", () => {
      const key = normalizeKey(keyInput.value);
      if (!key || this.children.has(key)) return;
      const type = typeSelect.value;
      const defaultValue = createDefaultValue(type);
      this.addChild(key, defaultValue, { editableKey: true });
      keyInput.value = "";
    });
    const addWrapper = createElement("div", null);
    addWrapper.append(typeSelect, addBtn);
    addRow.append(keyInput, addWrapper);
    this.body.appendChild(addRow);
  }

  addChild(key, value, { editableKey = false } = {}) {
    const container = createElement("div", "editor-array-item");
    const row = createElement("div", "editor-row");
    const label = editableKey ? document.createElement("input") : createElement("label", null, key);
    if (editableKey) {
      label.value = key;
    }
    const child = buildNode(value, key);
    row.append(label, child.element);
    container.appendChild(row);

    const actions = createElement("div", "editor-array-actions");
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "Remove";
    removeBtn.className = "danger";
    removeBtn.addEventListener("click", () => {
      container.remove();
      this.children.delete(key);
    });
    actions.appendChild(removeBtn);
    container.appendChild(actions);

    this.body.appendChild(container);
    this.children.set(key, { node: child, container, label });
  }

  getValue() {
    const result = {};
    for (const [key, entry] of this.children) {
      const resolvedKey = entry.label instanceof HTMLInputElement ? normalizeKey(entry.label.value) : key;
      if (!resolvedKey) continue;
      result[resolvedKey] = entry.node.getValue();
    }
    return result;
  }
}

class ArrayNode {
  constructor(value, label) {
    this.label = label;
    this.value = Array.isArray(value) ? value : [];
    this.children = [];
    this.element = createElement("div", "editor-node");
    this.details = createElement("details");
    this.details.open = true;
    const summary = createElement("summary", null, `${label} · Array`);
    this.details.appendChild(summary);

    this.body = createElement("div");
    this.details.appendChild(this.body);
    this.element.appendChild(this.details);

    this.value.forEach((entry, index) => {
      this.addItem(entry, index);
    });

    this.addControls();
  }

  addControls() {
    const addRow = createElement("div", "editor-row");
    const label = createElement("label", null, "Add item");
    const select = document.createElement("select");
    [VALUE_TYPES.string, VALUE_TYPES.number, VALUE_TYPES.boolean, VALUE_TYPES.object, VALUE_TYPES.array, VALUE_TYPES.null]
      .forEach((type) => {
        const opt = document.createElement("option");
        opt.value = type;
        opt.textContent = type;
        select.appendChild(opt);
      });
    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.textContent = "Append";
    addBtn.className = "ghost";
    addBtn.addEventListener("click", () => {
      const type = select.value;
      this.addItem(createDefaultValue(type));
    });
    const wrapper = createElement("div", null);
    wrapper.append(select, addBtn);
    addRow.append(label, wrapper);
    this.body.appendChild(addRow);
  }

  addItem(value) {
    const index = this.children.length;
    const container = createElement("div", "editor-array-item");
    const child = buildNode(value, `${this.label}[${index}]`);
    container.appendChild(child.element);
    const actions = createElement("div", "editor-array-actions");
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "Remove";
    removeBtn.className = "danger";
    removeBtn.addEventListener("click", () => {
      container.remove();
      this.children = this.children.filter((entry) => entry !== child);
    });
    actions.appendChild(removeBtn);
    container.appendChild(actions);
    this.body.appendChild(container);
    this.children.push(child);
  }

  getValue() {
    return this.children.map((child) => child.getValue());
  }
}

function buildNode(value, label) {
  const type = inferValueType(value);
  if (type === VALUE_TYPES.array) return new ArrayNode(value, label);
  if (type === VALUE_TYPES.object) return new ObjectNode(value, label);
  return new PrimitiveNode(value, label);
}

export function createJsonEditor({ value, label = "Root" } = {}) {
  const node = buildNode(value, label);
  return {
    element: node.element,
    getValue: () => node.getValue()
  };
}
