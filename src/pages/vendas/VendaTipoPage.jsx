import { useParams } from "react-router-dom";
import PageNotFound from "@/lib/PageNotFound";
import Fechamentos from "./Fechamentos";
import Conferencia from "./Conferencia";
import Sangrias from "./Sangrias";
import Recebiveis from "./Recebiveis";
import Calendario from "./Calendario";

const PAGES = {
  "fechamentos": Fechamentos,
  "conferencia": Conferencia,
  "sangrias": Sangrias,
  "recebiveis": Recebiveis,
  "calendario": Calendario,
};

export default function VendaTipoPage() {
  const { tipo } = useParams();
  const Comp = PAGES[tipo];
  if (!Comp) return <PageNotFound />;
  return <Comp />;
}