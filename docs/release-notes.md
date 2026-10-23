# Godoy 3D Modding 0.5.2 beta

- Corrige o carregamento do ped: aceita e copia buffers Uint8Array vindos da janela principal pelo IPC, sem rejeitar o esqueleto por diferença de contexto.
- Corrige reconhecimento dos hashes GTA em minúsculas de DiffuseSampler e BumpSampler; mantém compatibilidade com arquivos antigos de hashes mistos.
- Exportação de OBJ incorporado com UV automático sem sobreposição entre faces e textura diffuse própria de 1024×1024 dentro do mesmo YTD da roupa.
- Novo botão **Associar YTD original para gerar UV** na aba Malhas e objetos. Com OBJ incorporado, exporta um ZIP com YDD, YTD atualizado e guias UV transparentes em PNG.
- Clona o shader da região de destino e vincula o OBJ à nova diffuse, com mapas auxiliares neutros. Mantém os samplers, UVs e pixels originais da roupa. Material separado em todos os LODs.
- Pintura de roupas mostra as arestas UV da textura selecionada. Escolha `godoy_obj_…` em **TEXTURAS DO DICIONÁRIO** para pintar somente o OBJ; exporte o YTD editado e use junto ao novo YDD.
- Exportação sem OBJ continua gerando somente YDD. A união e Ctrl+Z/Ctrl+Y continuam disponíveis.

Limites: UV inicial com ilhas triangulares; não faz unwrap artístico, solda booleana nem importa MTL/imagens do OBJ. Textura nova começa cinza. Até 21845 triângulos por parte após separação das costuras, 100000 vértices no total, 32 partes e 10 MB de dados. Copia geometria aos LODs sem decimação. Requer material com DiffuseSampler compatível. Sem colisões ou exportação YFT. Validação automatizada não substitui teste de animação e aparência com assets reais no FiveM.
