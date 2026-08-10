import WorkflowTeaser from "../components/WorkflowTeaser";

export default function GroceryScreen() {
  return (
    <WorkflowTeaser
      active="shop"
      icon="cart-outline"
      title="Your shopping list, built for you"
      description="Once this ships, your grocery list will build itself from whatever you plan this week — no re-typing."
    />
  );
}
