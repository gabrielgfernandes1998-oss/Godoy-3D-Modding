# Godoy 3D Modding 0.3.0 beta

- Seleção da peça inteira no mesmo viewport do ped, sem árvore de drawables/LODs.
- Exportação nativa YDD: grava posição, rotação e escala em todos os LODs e transforma normais/tangentes.
- Opção de preservar rig original ou prender acessório rigidamente à pelve, cabeça ou tronco. Quando necessário, usa esqueleto do ped YDD carregado/importado.
- Reabre e verifica vértices, pesos, índices, bindings e LODs antes de exportar. Mantém materiais, UVs e nome do arquivo; use o YTD original.
- Ctrl+Z/Ctrl+Y também desfazem/refazem a escolha do vínculo. OBJ/GLB ficam em ferramentas avançadas.
- Corrige offsets de escrita CodeWalker quando faltam LODs intermediários.

Limites: sem incorporação OBJ nativa, pintura de pesos, colisões próprias ou exportação YFT. Layouts incompatíveis são recusados. Não converte a categoria/META/YMT de prop de cabeça em roupa de cintura. Preview estático; testes de animação no FiveM e extração do ped de instalação real ainda precisam de validação.
