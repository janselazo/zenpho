import ResourcesGrid from "@/components/resources/ResourcesGrid";

export default function ResourcesSection() {
  return (
    <ResourcesGrid
      limit={4}
      showSectionHeading
      showViewAll
    />
  );
}
