# Referência: grzyClothTool

Repositório: https://github.com/grzybeek/grzyClothTool
Commit inspecionado: `6b118754e332414e7026b694b7559bfff56984a4` (master).
Licença do projeto: GPL-3.0. Nenhum código ou asset desse projeto foi copiado para o Godoy 3D Modding nesta correção.

## De onde vêm os peds

`Helpers/CWHelper.cs` usa GTAFolder para localizar/validar a instalação do GTA V e seleciona `mp_m_freemode_01` ou `mp_f_freemode_01`. `Controls/PreviewWindowHost.xaml.cs` só inicializa o preview quando a pasta do jogo é válida. A renderização depende do CodeWalker incluído no projeto, com seu próprio histórico/licenciamento. O repositório contém placeholders reservedDrawable.ydd/reservedTexture.ytd; eles não são peds completos.

Portanto, baixar esses fontes não fornece por si só os modelos de personagem. Integração automática exige um leitor RPF, gerenciamento das dependências do ped e arquivos de uma instalação autorizada GTA V; isso não está implementado no Godoy.

## O que foi aproveitado nesta versão

A referência motivou distinguir o ped base dos drawables editados e manter os gêneros separados. Implementação original em src/ped-library.js: arquivos YDD/GLB fornecidos pelo usuário são guardados localmente por gênero; a cena de referência é separada da geometria exportável. Não há manequim genérico apresentado como ped original.

## Recursos úteis para evolução

- `Helpers/BuildResourceHelper.cs`: criação de CPedVariationInfo/YMT, propMask, numAvailTex, compInfos, props, variações de primeira pessoa e metadados de cabelo.
- `Models/AddonManager.cs` e helpers: gestão de addons, componentes, reserva de índices e divisão de coleções maiores.
- `Helpers/PedAlternativeVariationsHelper.cs`: relação entre máscaras/cabelo e metadados de variação.
- `Helpers/CWHelper.cs`: reescrita de drawables e configurações de cabelo/salto no formato nativo.

A geração YMT independente do Godoy usa os mesmos campos do formato; a referência confirma a soma de texturas por componente, propMask 1/17 e distribution 255. Isso não acrescenta automaticamente suporte a props, física, rigging ou extração de peds. Essas integrações ainda precisam de implementação e validação próprias, com observância das licenças dos componentes reutilizados.
