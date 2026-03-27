import { PollForm } from "@/components/poll/poll-form";

type PollPageProps = {
  params: {
    id: string;
  };
};

export default function PollPage({ params }: PollPageProps) {
  return <PollForm pollId={params.id} />;
}
