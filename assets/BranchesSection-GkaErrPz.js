import{g as ve,a as be,b as Se,c as Ee,d as Ne,r as t,t as N,j as e,S as Te,e as Pe,f as Fe,h as De,i as Ue,k as ke,F as Be,l as Ie,m as l,I as m,n as P,B as se,G as j,o as c,p as V,P as we,D as Me,T as Oe,q as Re,s as Ae,u as ze,v as Le,w as x,x as Ve,y as u,z as $e,A as Ge}from"./index-B7-kJ0mw.js";function Qe(){return ve()}function qe(n,d=""){return be(n,{query:d})}function He(n,d,v=""){return!n||!d?[]:Ee(n,d,{query:v})}function _e(n){return Se(n)}function We(n,d){return Ne(n,d)}const $={nit:"",rut:"",rutPdfUrl:"",porcentajeComision:0,nombre:"",direccion:"",ciudad:"",localidad:"",pais:"CO",telefono:"",email:"",estado:!0},Ye=x.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
  margin-bottom: 12px;
`,T=x.article`
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 10px 18px rgba(12, 26, 20, 0.06);

  p {
    margin: 0;
    font-size: 0.74rem;
    color: var(--text-muted);
  }

  strong {
    display: block;
    margin-top: 4px;
    font-size: 0.98rem;
  }

  @media (max-width: 520px) {
    padding: 7px 9px;

    p {
      font-size: 0.72rem;
    }

    strong {
      font-size: 0.92rem;
    }
  }
`,Je=x.div.attrs({className:"no-wrap"})`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
`,Ke=x.input`
  display: none;
`,te=x.small`
  color: var(--text-muted);
  font-weight: 500;
  font-size: 0.72rem;
`,G=x(m)`
  padding: 7px 10px;
  font-size: 0.82rem;
  min-height: 34px;

  @media (max-width: 520px) {
    padding: 6px 9px;
    font-size: 0.78rem;
    min-height: 32px;
  }
`,Xe=x(P)`
  padding: 7px 10px;
  font-size: 0.82rem;
  min-height: 34px;
  padding-right: 30px;
  background-position: right 9px center;

  @media (max-width: 520px) {
    padding: 6px 9px;
    font-size: 0.78rem;
    min-height: 32px;
    padding-right: 28px;
    background-position: right 8px center;
  }
`;function ei({branches:n,status:d,error:v,createStatus:Q,createError:q,updateStatus:H,updateError:_,deleteStatus:b,deleteError:ne,onCreateBranch:re,onUpdateBranch:oe,onDeleteBranch:le,onReload:de}){const[a,o]=t.useState($),[F,p]=t.useState(null),[W,g]=t.useState("idle"),[D,S]=t.useState(null),[f,U]=t.useState(null),[ce,Y]=t.useState(null),[k,ue]=t.useState(!1),[B,I]=t.useState(""),[w,C]=t.useState(""),[M,h]=t.useState(""),J=t.useRef(null),me=N(v,"sucursales"),K=N(q,"sucursales"),X=N(_,"sucursales"),O=N(ne,"sucursales"),Z=Q==="submitting"||H==="submitting",R=t.useMemo(()=>Qe(),[]),pe=t.useMemo(()=>{const i=B.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();return i?R.filter(s=>s.label.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().includes(i)):R},[R,B]),A=t.useMemo(()=>qe(a.pais,w),[a.pais,w]),ee=t.useMemo(()=>_e(a.pais),[a.pais]),z=t.useMemo(()=>He(a.pais,a.ciudad,M),[a.pais,a.ciudad,M]),ie=t.useMemo(()=>We(a.pais,a.ciudad),[a.pais,a.ciudad]),xe=ee>A.length,he=ie>z.length,E=t.useMemo(()=>{const i=n.length,s=n.filter(y=>y.estado).length,r=i-s,L=n.filter(y=>!!y.email).length;return{total:i,active:s,inactive:r,withEmail:L}},[n]),je=async i=>{i.preventDefault(),p(null);const s=Ve(String(a.porcentajeComision)),r={nit:u(a.nit,30),rut:u(a.rut,40),rutPdfUrl:a.rutPdfUrl.trim(),porcentajeComision:s??-1,nombre:u(a.nombre,80),direccion:u(a.direccion,140),ciudad:u(a.ciudad,80),localidad:u(a.localidad,80),pais:u(a.pais,80)||"CO",telefono:u(a.telefono,25),email:a.email.trim().toLowerCase(),estado:a.estado};if(!r.nit||!r.nombre){p("Debes completar NIT y nombre de la sucursal.");return}if(!r.pais||!r.ciudad||!r.localidad){p("Debes seleccionar pais, ciudad y barrio/municipio.");return}if(s===null||s<0||s>100){p("El porcentaje de comision debe estar entre 0 y 100.");return}if(r.email&&!$e(r.email)){p("El correo de la sucursal no es valido.");return}try{f?(await oe(f,r),U(null)):await re(r),o($),I(""),C(""),h("")}catch{}},ge=i=>{p(null),S(null),g("idle"),U(i.id),o({nit:i.nit,rut:i.rut??"",rutPdfUrl:i.rutPdfUrl??"",porcentajeComision:i.porcentajeComision,nombre:i.nombre,direccion:i.direccion??"",ciudad:i.ciudad??"",localidad:i.localidad??"",pais:i.pais,telefono:i.telefono??"",email:i.email??"",estado:i.estado}),C(i.ciudad??""),h(i.localidad??"")},ae=()=>{U(null),p(null),o($),I(""),C(""),h(""),g("idle"),S(null)},fe=()=>{J.current?.click()},Ce=async i=>{const s=i.target.files?.[0];if(i.currentTarget.value="",!!s){g("uploading"),S(null);try{const r=a.nit||a.nombre||"sucursal",L=await Ge(s,r);o(y=>({...y,rutPdfUrl:L})),g("idle")}catch(r){g("error"),S(r instanceof Error?r.message:"No se pudo subir el PDF RUT.")}}},ye=async i=>{if(window.confirm(`Vas a eliminar la sucursal "${i.nombre}". Esta accion no se puede deshacer. Deseas continuar?`)){Y(i.id);try{await le(i.id),f===i.id&&ae()}finally{Y(null)}}};return e.jsxs(Te,{children:[e.jsxs(Pe,{children:[e.jsx(Fe,{children:"Sucursales"}),e.jsxs(De,{children:[e.jsxs(Ue,{children:[n.length," registradas"]}),e.jsx(ke,{type:"button",onClick:()=>ue(i=>!i),"aria-expanded":!k,children:k?"Mostrar":"Ocultar"})]})]}),!k&&e.jsxs(e.Fragment,{children:[e.jsxs(Ye,{children:[e.jsxs(T,{children:[e.jsx("p",{children:"Total registradas"}),e.jsx("strong",{children:E.total})]}),e.jsxs(T,{children:[e.jsx("p",{children:"Activas"}),e.jsx("strong",{children:E.active})]}),e.jsxs(T,{children:[e.jsx("p",{children:"Inactivas"}),e.jsx("strong",{children:E.inactive})]}),e.jsxs(T,{children:[e.jsx("p",{children:"Con correo"}),e.jsx("strong",{children:E.withEmail})]})]}),e.jsxs(Be,{onSubmit:je,children:[e.jsxs(Ie,{children:[e.jsxs(l,{children:["NIT",e.jsx(m,{value:a.nit,onChange:i=>o(s=>({...s,nit:i.target.value})),placeholder:"Ej: 900123456-7",required:!0})]}),e.jsxs(l,{children:["RUT",e.jsx(m,{value:a.rut,onChange:i=>o(s=>({...s,rut:i.target.value})),placeholder:"Ej: 900123456-7"})]}),e.jsxs(l,{children:["Nombre comercial",e.jsx(m,{value:a.nombre,onChange:i=>o(s=>({...s,nombre:i.target.value})),placeholder:"Ej: Sede Centro",required:!0})]}),e.jsxs(l,{children:["Porcentaje de comision",e.jsx(m,{inputMode:"decimal",value:Number.isFinite(a.porcentajeComision)?String(a.porcentajeComision):"",onChange:i=>o(s=>({...s,porcentajeComision:Number(i.target.value)})),placeholder:"Ej: 25",required:!0})]}),e.jsxs(l,{children:["Pais",e.jsx(G,{value:B,onChange:i=>I(i.target.value),placeholder:"Buscar pais..."}),e.jsxs(Xe,{value:a.pais,onChange:i=>{C(""),h(""),o(s=>({...s,pais:i.target.value,ciudad:"",localidad:""}))},children:[e.jsx("option",{value:"",children:"Selecciona un pais"}),pe.map(i=>e.jsx("option",{value:i.value,children:i.label},i.value))]})]}),e.jsxs(l,{children:["Ciudad",e.jsx(G,{value:w,onChange:i=>C(i.target.value),placeholder:a.pais?"Buscar ciudad...":"Primero selecciona un pais",disabled:!a.pais}),e.jsxs(P,{value:a.ciudad,onChange:i=>{h(""),o(s=>({...s,ciudad:i.target.value,localidad:""}))},disabled:!a.pais,children:[e.jsx("option",{value:"",children:a.pais?"Selecciona una ciudad":"Primero selecciona un pais"}),A.map(i=>e.jsx("option",{value:i.value,children:i.label},i.value))]}),e.jsx(te,{children:a.pais?`Mostrando ${A.length} de ${ee} ciudades disponibles.${xe?" Escribe 2 letras para afinar y ver mas resultados.":""}`:"Selecciona un pais para cargar ciudades."})]}),e.jsxs(l,{children:["Barrio o Municipio",e.jsx(G,{value:M,onChange:i=>h(i.target.value),placeholder:a.ciudad?"Buscar barrio o municipio...":"Primero selecciona una ciudad",disabled:!a.ciudad}),e.jsxs(P,{value:a.localidad,onChange:i=>o(s=>({...s,localidad:i.target.value})),disabled:!a.ciudad,children:[e.jsx("option",{value:"",children:a.ciudad?"Selecciona barrio o municipio":"Primero selecciona una ciudad"}),z.map(i=>e.jsx("option",{value:i.value,children:i.label},i.value))]}),e.jsx(te,{children:a.ciudad?`Mostrando ${z.length} de ${ie} barrios/municipios disponibles.${he?" Escribe 2 letras para afinar y ver mas resultados.":""}`:"Selecciona una ciudad para cargar barrios o municipios."})]}),e.jsxs(l,{children:["Telefono",e.jsx(m,{value:a.telefono,onChange:i=>o(s=>({...s,telefono:i.target.value})),placeholder:"Ej: +57 300 000 0000"})]}),e.jsxs(l,{children:["Correo de sucursal",e.jsx(m,{type:"email",value:a.email,onChange:i=>o(s=>({...s,email:i.target.value})),placeholder:"Ej: sucursal@empresa.com"})]}),e.jsxs(l,{children:["Direccion",e.jsx(m,{value:a.direccion,onChange:i=>o(s=>({...s,direccion:i.target.value})),placeholder:"Ej: Cra 10 # 20-30"})]}),e.jsxs(l,{children:["Estado",e.jsxs(P,{value:a.estado?"ACTIVO":"INACTIVO",style:{color:a.estado?"#5a2f99":"#5d636a"},onChange:i=>o(s=>({...s,estado:i.target.value==="ACTIVO"})),children:[e.jsx("option",{value:"ACTIVO",children:"Activo"}),e.jsx("option",{value:"INACTIVO",children:"Inactivo"})]})]}),e.jsxs(l,{children:["PDF RUT",e.jsxs(se,{children:[e.jsx(j,{type:"button",onClick:fe,disabled:W==="uploading",children:W==="uploading"?"Subiendo PDF...":"Subir PDF RUT"}),a.rutPdfUrl&&e.jsx(j,{type:"button",as:"a",href:a.rutPdfUrl,target:"_blank",rel:"noreferrer",children:"Ver PDF"})]}),e.jsx(Ke,{ref:J,type:"file",accept:"application/pdf",onChange:Ce})]})]}),(F||K||D)&&e.jsx(c,{kind:F||D?"error":V(q)?"info":"error",message:F??D??K??"Error inesperado."}),X&&e.jsx(c,{kind:V(_)?"info":"error",message:X}),Q==="success"&&e.jsx(c,{kind:"info",message:"Sucursal creada correctamente."}),H==="success"&&e.jsx(c,{kind:"info",message:"Sucursal actualizada correctamente."}),(O||b==="success")&&e.jsx(c,{kind:O?"error":"info",message:O??"Sucursal eliminada correctamente."}),e.jsxs(se,{children:[e.jsx(we,{type:"submit",disabled:Z,children:Z?"Guardando...":f?"Guardar cambios":"Registrar sucursal"}),f&&e.jsx(j,{type:"button",onClick:ae,children:"Cancelar edicion"}),e.jsx(j,{type:"button",onClick:()=>de(),children:"Actualizar listado"})]})]}),e.jsx(Me,{}),d==="loading"&&e.jsx(c,{kind:"loading",message:"Cargando sucursales..."}),d==="error"&&e.jsx(c,{kind:V(v)?"info":"error",message:me??"Error inesperado."}),d==="success"&&n.length===0&&e.jsx(c,{kind:"empty",message:"No hay sucursales registradas. Crea la primera con el formulario."}),d==="success"&&n.length>0&&e.jsx(Oe,{children:e.jsxs(Re,{children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{className:"hide-mobile",children:"NIT"}),e.jsx("th",{className:"hide-mobile",children:"RUT"}),e.jsx("th",{children:"Sucursal"}),e.jsx("th",{className:"hide-mobile",children:"Pais"}),e.jsx("th",{children:"Ciudad"}),e.jsx("th",{className:"hide-mobile",children:"Barrio/Municipio"}),e.jsx("th",{className:"num",children:"Comision %"}),e.jsx("th",{className:"hide-mobile",children:"PDF RUT"}),e.jsx("th",{className:"hide-mobile",children:"Direccion"}),e.jsx("th",{className:"hide-mobile",children:"Telefono"}),e.jsx("th",{className:"hide-mobile",children:"Email"}),e.jsx("th",{children:"Estado"}),e.jsx("th",{className:"hide-mobile",children:"Creada"}),e.jsx("th",{className:"actions",children:"Acciones"})]})}),e.jsx("tbody",{children:n.map(i=>e.jsxs("tr",{children:[e.jsx("td",{className:"hide-mobile",children:i.nit}),e.jsx("td",{className:"hide-mobile",children:i.rut??"Sin RUT"}),e.jsx("td",{children:i.nombre}),e.jsx("td",{className:"hide-mobile",children:i.pais}),e.jsx("td",{children:i.ciudad??"Sin ciudad"}),e.jsx("td",{className:"hide-mobile",children:i.localidad??"Sin localidad"}),e.jsxs("td",{className:"num",children:[i.porcentajeComision.toFixed(2),"%"]}),e.jsx("td",{className:"hide-mobile",children:i.rutPdfUrl?e.jsx(j,{as:"a",href:i.rutPdfUrl,target:"_blank",rel:"noreferrer",children:"Ver PDF"}):"Sin PDF"}),e.jsx("td",{className:"hide-mobile",children:i.direccion??"Sin direccion"}),e.jsx("td",{className:"hide-mobile",children:i.telefono??"Sin telefono"}),e.jsx("td",{className:"hide-mobile",children:i.email??"Sin email"}),e.jsx("td",{children:e.jsx(Ae,{$tone:i.estado?"ok":"off",children:i.estado?"Activa":"Inactiva"})}),e.jsx("td",{className:"hide-mobile",children:ze(i.createdAt)}),e.jsx("td",{className:"actions",children:e.jsxs(Je,{children:[e.jsx(j,{type:"button",onClick:()=>ge(i),disabled:b==="submitting",children:"Editar"}),e.jsx(Le,{type:"button",onClick:()=>ye(i),disabled:b==="submitting",children:b==="submitting"&&ce===i.id?"Eliminando...":"Eliminar"})]})})]},i.id))})]})})]})]})}export{ei as BranchesSection};
