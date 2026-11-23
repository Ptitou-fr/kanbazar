type ExampleStatusProps = {
  status: string;
};

export function ExampleStatus({ status }: ExampleStatusProps) {
  return <p>Statut : {status}</p>;
}
