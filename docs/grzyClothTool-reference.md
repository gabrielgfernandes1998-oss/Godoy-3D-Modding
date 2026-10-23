# Referência funcional: grzyClothTool e Pack Godoy 0.8.0

Repositório inspecionado: https://github.com/grzybeek/grzyClothTool · master `6b118754e332414e7026b694b7559bfff56984a4` · GPL-3.0. O gerenciador/preview/compilador JS são implementações próprias. O núcleo CodeWalker GPL já é distribuído pelo Godoy com fonte e avisos, conforme a integração existente.

A prioridade pedida foi importar/organizar/exportar, gerenciar/criar variações, preview no ped e props. A tela mantém a linguagem visual do Godoy.

| Fluxo de referência | Implementação Godoy |
| --- | --- |
| Projeto persistente, addons/componentes/gênero | `.godoypack` ZIP com assets, autosave recuperável, categorias e ambos os gêneros |
| Organização de drawables | Busca, grupo/tags, nomes de exibição, duplicar/remover/reordenar e desfazer/refazer |
| Texturas/variações | Miniaturas, adicionar/associar/substituir, criar cópia independente, renomear/ordenar/remover, YTD/PNG e envio à pintura |
| Preview de várias peças | Uma peça por slot, variações e props simultâneos; ped do GTA via CodeWalker ou importado; câmera/wireframe |
| Props | 13 categorias de âncora, nomes externos com `_p_`, YMT CPedPropMetaData/CPedPropTexData/CAnchorProps e enums |
| Exportar FiveM e dividir addons grandes | Reindexação externa, divisões por limite de drawable/textura/props, META/YMT/manifest/relatório |
| Flags/áudio/salto/redução de cabelo | Campos gravados nos metadados; efeito visual/animação conferido no jogo |

`Helpers/BuildResourceHelper.cs`, `Models/AddonManager.cs`, `Models/Drawable/GDrawable.cs`, `Models/Texture/GTexture.cs` e `Controls/Drawable/SelectedDrawable.xaml` foram usados para entender os fluxos e convenções. A associação automática exige nomes compatíveis; casos ambíguos ficam disponíveis para associação manual. A renumeração externa acompanha o princípio do builder de referência: preserva os bytes dos assets quando não há operação específica sobre os binários.

Não há paridade integral: reserva de slots vazios, importação de projetos grzy, edições em lote de flags, otimização/conversão DDS em lote, física YLD, variantes de primeira pessoa, alternativas/máscaras/cabelo avançadas, preview animado/skin completo e builds Singleplayer/alt:V ainda não estão incluídos. O ped GTA precisa de instalação autorizada; nenhum ped original é redistribuído. Props não corrigem rig ou clipping automaticamente.

Código do Godoy: `src/pack-project.js` (dados/projeto/exportação), `src/pack-builder.js` + CSS (interface), `src/pack-preview.js` (3D), `src/pack.js` + `src/ymt.js` (recurso/metadados). A suíte nativa usa o CodeWalker para ler independentemente um YMT misto de roupas/props e conferir campos, âncoras, variações, enums e valores.
