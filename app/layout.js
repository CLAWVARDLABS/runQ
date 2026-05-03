import './globals.css';

export const metadata = {
  title: 'RunQ Run Inbox',
  description: 'Local coding-agent run quality workbench'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
