# Godoy 3D Modding 0.8.0 beta

- Novo Pack de roupas inspirado no fluxo do grzyClothTool, com identidade visual Godoy: biblioteca por componente/gênero, catálogo pesquisável, grupos/tags, preview 3D e painel de variações.
- Projetos `.godoypack` incluem modelos/texturas/configurações; abrir/salvar, recuperação de autosave e Ctrl+Z/Ctrl+Y. Duplicar/remover/reordenar peças e exportar ambos os gêneros juntos.
- Variações com miniaturas, adicionar/associar/substituir YTD, duplicar para criar nova pintura, renomear/reordenar/remover, exportar YTD/PNG e abrir na pintura. Exportar do editor atualiza somente a variação aberta; a original é preservada.
- Preview de várias categorias sobre ped do GTA pelo CodeWalker ou ped local YDD/GLB. Câmera, wireframe, ocultar ped e alternar peças/variações. Corpo GTA em material neutro, pose estática.
- Props: 13 categorias de âncoras, nomes externos FiveM próprios e metadados de variação no YMT. Campos de flags, áudio, salto e redução de cabelo gravados nos metadados.
- Exportação aceita lacunas nos índices de entrada e reindexa os nomes externos sem alterar binários. Divide coleções grandes por 128 drawables/255 texturas por componente e por 255 props. Gera ZIP com META/YMT/manifest e relatório de mapeamento.
- A edição de malhas/atlas UV aprovada na 0.7.0 permanece disponível.

Props exigem assets/rig compatíveis; não corrigem clipping nem pesos automaticamente. Sem paridade integral com grzy: física/primeira pessoa/slots reservados, importação de projetos grzy, otimização DDS em lote, preview animado e builds SP/alt:V não incluídos. Até 80 MB por arquivo, 256 MB por projeto/exportação e 26 variações por peça. Estrutura validada com CodeWalker; aparência/animação com assets reais precisa de teste no FiveM Legacy.
