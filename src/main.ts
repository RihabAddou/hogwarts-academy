import {
  type Wizard,
  type NewWizard,
  type Spell,
  type AcademyEvent,
  type House,
  type HousePoints,
  type SpellCategory,
  type SpellOutput,
  type ArrayElement,
  type WizardSummary,
  type WizardUpdate,
  type AttackSpell,
  type NonHealingCategory,
  type SpellCastEvent,
} from "./types";

import { WizardRepository, SpellRepository } from "./repository";
import { Log } from "./decorators";


function isHouse(value: unknown): value is House {
  return (
    value === "Gryffindor" ||
    value === "Slytherin" ||
    value === "Ravenclaw" ||
    value === "Hufflepuff"
  );
}

// Type guard: safely narrow unknown data to a Wizard.
function isWizard(value: unknown): value is Wizard {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === "number" &&
    typeof candidate.name === "string" &&
    isHouse(candidate.house) &&
    typeof candidate.level === "number" &&
    typeof candidate.active === "boolean"
  );
}

function handleSpellCast(event: SpellCastEvent): void {
  console.log(`Wizard ${event.wizardId} cast ${event.spellName}`);
}

class AcademyService {
  constructor(
    private readonly wizards: WizardRepository,
    private readonly spells: SpellRepository
  ) {}

  registerWizard(data: NewWizard): Wizard {
    const candidate = { ...data, id: this.nextWizardId() };

    if (!isWizard(candidate)) {
      throw new Error("Invalid wizard data");
    }

    this.wizards.add(candidate);
    return candidate;
  }

  private nextWizardId(): number {
    const ids = this.wizards.getAll().map(wizard => wizard.id);
    return ids.length === 0 ? 1 : Math.max(...ids) + 1;
  }

  @Log
  castSpell(wizardId: number, spellId: number): string {
    const wizard = this.wizards.findById(wizardId);
    const spell = this.spells.findById(spellId);

    if (!wizard || !spell) {
      throw new Error("Wizard or spell not found");
    }

    return `${wizard.name} casts ${spell.name}!`;
  }

    findByHouse(house: House): WizardSummary[] {
    return this.wizards
      .findByHouse(house)
      .map(({ id, name, house }) => ({ id, name, house }));
  }

  updateWizard(id: number, changes: WizardUpdate): boolean {
    return this.wizards.update(id, changes);
  }

  getSpellEvents(events: AcademyEvent[]): SpellCastEvent[] {
    return events.filter(
      (event): event is SpellCastEvent => event.type === "spell-cast"
    );
  }
}

const wizards = new WizardRepository();
const spells = new SpellRepository();

wizards.add({
  id: 1,
  name: "Harry Potter",
  house: "Gryffindor",
  level: 5,
  active: true,
  patronus: "Stag"
});

wizards.add({
  id: 2,
  name: "Hermione Granger",
  house: "Gryffindor",
  level: 8,
  active: true
});

wizards.add({
  id: 3,
  name: "Draco Malfoy",
  house: "Slytherin",
  level: 6,
  active: true
});

spells.add({
  id: 101,
  name: "Expelliarmus",
  category: "attack",
  power: 80
});

spells.add({
  id: 102,
  name: "Protego",
  category: "defense",
  power: 60
});

const academy = new AcademyService(wizards, spells);

console.log("\n--- Register a new wizard ---");
const ron = academy.registerWizard({
  name: "Ron Weasley",
  house: "Gryffindor",
  level: 4,
  active: true
});
console.log(ron);

console.log("\n--- Register an invalid wizard ---");
try {
  academy.registerWizard({
    name: "Viktor Krum",
    house: "Durmstrang", // not a valid House
    level: 7,
    active: true
  });
} catch (error) {
  console.log("Expected error:", (error as Error).message);
}

console.log("\n--- Repository: find by house ---");
console.log(wizards.findByHouse("Gryffindor")); 
console.log(wizards.findByHouse("Slytherin"));  
console.log(wizards.findByHouse("Ravenclaw")); 

// @ts-expect-error "Durmstrang" is not a valid House
wizards.findByHouse("Durmstrang");

console.log("\n--- Cast a spell ---");
console.log(academy.castSpell(1, 101));

console.log("\n--- Find wizards by house ---");
console.log(academy.findByHouse("Gryffindor"));

console.log("\n--- Update a wizard ---");
academy.updateWizard(1, { level: 6 });
console.log(wizards.findById(1));

console.log("\n--- Type guard ---");
const unknownWizard: unknown = wizards.findById(1);
if (isWizard(unknownWizard)) {
  console.log(`${unknownWizard.name} belongs to ${unknownWizard.house}`);
}

console.log("\n--- Record utility type ---");
const points: HousePoints = {
  Gryffindor: 100,
  Slytherin: 80,
  Ravenclaw: 90,
  Hufflepuff: 70
};
console.log(points);

console.log("\n--- Extract spell-cast events ---");
const events: AcademyEvent[] = [
  { type: "spell-cast", wizardId: 1, spellName: "Lumos" },
  { type: "level-up", wizardId: 2, newLevel: 9 },
  { type: "wizard-expelled", wizardId: 3 }
];
console.log(academy.getSpellEvents(events));

console.log("\n--- Handle a spell-cast event ---");
handleSpellCast({
  type: "spell-cast",
  wizardId: 1,
  spellName: "Expelliarmus"
});

// TypeScript still verifies that the invalid events below are rejected.
function compileTimeChecks(): void {
  // @ts-expect-error a level-up event is not a SpellCastEvent
  handleSpellCast({ type: "level-up", wizardId: 2, newLevel: 9 });

  // @ts-expect-error a wizard-expelled event is not a SpellCastEvent
  handleSpellCast({ type: "wizard-expelled", wizardId: 3 });
}
void compileTimeChecks;

// Compile-time demonstrations: these aliases are checked by TypeScript.
type CastArguments = Parameters<AcademyService["castSpell"]>;
type CastResult = ReturnType<AcademyService["castSpell"]>;
type AttackOutput = SpellOutput<"attack">; // number
type HealingOutput = SpellOutput<"healing">; // string
type SpellItem = ArrayElement<Spell[]>; // Spell
type AttackSpellExample = AttackSpell;
type RemainingCategories = NonHealingCategory;
type CategoryExample = SpellCategory;

const typeExamples: [
  CastArguments,
  CastResult,
  AttackOutput,
  HealingOutput,
  SpellItem,
  AttackSpellExample["category"],
  RemainingCategories,
  CategoryExample
] | null = null;

void typeExamples;
