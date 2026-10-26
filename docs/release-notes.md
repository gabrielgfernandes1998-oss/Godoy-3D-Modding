# Godoy 3D Modding 0.11.1 beta

- Corrige acessórios OBJ/GLB listados, mas invisíveis no grzyClothTool/CodeWalker: os modelos gerados agora recebem RenderMask 255, incluindo o bit de renderização normal, em todos os LODs. Antes saíam com máscara zero e eram filtrados como proxies.
- Corrige o nome da família do shader para ped, mantendo a variante ped_default.sps e o atlas diffuse original.
- A exportação reabre o YDD e verifica a visibilidade dos modelos/LODs. Testes nativos e do executável conferem o mesmo bit usado pelo renderizador do grzy.

Reimporte o OBJ/GLB original na aba 05 e converta novamente, usando o mesmo ped, osso, posição e configuração de atlas. O YDD antigo não é reparado automaticamente. O YTD pintado pode ser reutilizado se a configuração/UV e o nome da textura forem exatamente os mesmos; mantenha uma cópia antes de substituir arquivos. As geometrias internas separadas são normais e não causam a invisibilidade. “Has Skin” no grzy deriva do sufixo r/u e não é o indicador de pesos de esqueleto.

Validação por leitura binária e pelo filtro de renderização da fonte do grzy/CodeWalker; a interface real do grzy e o FiveM precisam de confirmação no computador do usuário.
