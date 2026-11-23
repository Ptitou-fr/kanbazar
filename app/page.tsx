import { ExampleStatus } from "@/components/example-status";
import { exampleService } from "@/services/example-service";

export default async function Home() {
  const status = await exampleService.status();

  return (
    <main className="p-8">
      <ExampleStatus status={status} />
    </main>
  );
}
