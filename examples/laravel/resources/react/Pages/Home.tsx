import AppLayout from '../Layouts/AppLayout';

function Home({ message }: { message: string }) {
  return <section><h1>Satchel React example</h1><p data-testid="home-prop">{message}</p></section>;
}
Home.layout = AppLayout;
export default Home;
