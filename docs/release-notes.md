# Godoy 3D Modding 0.3.2 beta

- O gizmo acompanha o centro visível da peça, inclusive OBJ com origem distante dos vértices. Rotação e escala usam esse pivô; posição e exportação nativa continuam aplicadas ao objeto original.
- Enquadrar peça + referência mantém YDD/ped e seleção no mesmo enquadramento, respeitando proporção da janela e planos de recorte da câmera.
- OBJ com origem muito distante ou tamanho incompatível é colocado perto da referência na importação; escalas extremas são ajustadas e informadas. Vértices do arquivo original permanecem intactos.
- Trazer seleção para a referência recupera peças já afastadas, com Ctrl+Z/Ctrl+Y.
- LODs ocultos não deslocam o pivô nem distorcem o enquadramento.
- Corrige o rótulo da versão para acompanhar o package.json.

A exportação YDD da versão anterior permanece. OBJ unido ainda não é incorporado ao YDD nativo; a união continua nas ferramentas GLB. Validação FiveM com assets reais permanece necessária.
