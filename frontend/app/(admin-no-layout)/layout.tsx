import BackToParent from "@/components/ui/app/BackToParent";

export default function NoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-layout">
      {/* Fullscreen tools carry no navbar, so the phone's back button is the
          only way out of them; it goes to the page they were opened from. */}
      <BackToParent />
      {children}
    </div>
  );
}
