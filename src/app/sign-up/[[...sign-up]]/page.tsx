import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <main className="flex min-h-[80vh] items-center justify-center bg-gray-50">
      <SignUp />
    </main>
  );
}
