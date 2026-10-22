export function rankTextureCandidates(modelName, references, candidates) {
  const stem=modelName.toLowerCase().replace(/\.(ydd|yft)$/,'').replace(/_hi$/,'');
  const component=/([a-z]{4})_(\d{3})_[urm]$/.exec(stem.split('^').at(-1));
  const refs=new Set(references.map(s=>s.toLowerCase()));
  return candidates.map(candidate=> {
    const names=candidate.doc.textures.map(t=>t.name.toLowerCase());
    let score=names.filter(n=>refs.has(n)).length*10;
    const name=candidate.file.name.toLowerCase();
    if(name===stem+'.ytd')score+=100;
    if(component&&name.includes(`${component[1]}_diff_${component[2]}_`))score+=100;
    return {...candidate,score};
  }).sort((a,b)=>b.score-a.score||a.file.name.localeCompare(b.file.name));
}

export function attachAssetBatch({host,openModel,readModel,parseTexture,setTextures,notify}) {
  const panel=document.createElement('div');panel.className='section';
  panel.innerHTML='<button class="upload" id="batch-open">Abrir conjunto de modelos + YTD</button><input id="batch-files" type="file" accept=".ydd,.yft,.ytd" multiple hidden><label class="section-title" for="batch-model">MODELO DO CONJUNTO</label><select id="batch-model" class="full"></select><label class="section-title" for="batch-ytd">YTD ASSOCIADO</label><select id="batch-ytd" class="full"></select><p class="file-note" id="batch-status">Selecione os arquivos juntos para localizar o YTD por nomes e referências de materiais. Em caso de empate, escolha o dicionário.</p>';
  host.prepend(panel);
  const $=s=>panel.querySelector(s);let models=[],candidates=[],ranked=[];
  $('#batch-open').onclick=()=>$('#batch-files').click();
  const apply=index=> {
    const c=ranked[index];if(!c)return;
    setTextures(c.doc,c.buffer,c.file.name);$('#batch-status').textContent=`YTD associado: ${c.file.name}`;
  };
  async function chooseModel() {
    const file=models[Number($('#batch-model').value)];if(!file)return;
    if(!await openModel(file))return;
    const doc=readModel(),references=doc.drawables.flatMap(d=>d.shaders.flatMap(s=>s.textures.map(t=>t.name)));
    ranked=rankTextureCandidates(file.name,references,candidates);
    $('#batch-ytd').replaceChildren(new Option('Escolher dicionário…',''));
    ranked.forEach((c,i)=>$('#batch-ytd').append(new Option(`${c.file.name}${c.score?' · compatível':''}`,String(i))));
    if(ranked[0]?.score>0&&ranked[0].score!==ranked[1]?.score) {$('#batch-ytd').value='0';apply(0);}
    else $('#batch-status').textContent='Selecione o YTD correspondente. Nenhuma associação inequívoca encontrada.';
  }
  $('#batch-model').onchange=()=>chooseModel().catch(e=>notify(e.message));
  $('#batch-ytd').onchange=e=> {try{if(e.target.value!=='')apply(Number(e.target.value));}catch(error){notify(error.message);}};
  $('#batch-files').onchange=async e=> {
    try {
      const files=[...e.target.files];
      if(files.length>128||files.some(f=>f.size>80*1024*1024)||files.reduce((n,f)=>n+f.size,0)>256*1024*1024)throw Error('Conjunto acima do limite: 128 arquivos / 80 MB por arquivo / 256 MB total.');
      const nextModels=files.filter(f=>/\.(ydd|yft)$/i.test(f.name)),nextCandidates=[];let expanded=0;
      if(!nextModels.length)throw Error('Selecione pelo menos um YDD ou YFT.');
      for(const file of files.filter(f=>/\.ytd$/i.test(f.name))) {
        const buffer=await file.arrayBuffer(),doc=parseTexture(buffer);expanded+=doc.resource.data.length;
        if(expanded>256*1024*1024)throw Error('Dicionários descomprimidos acima de 256 MB. Divida o conjunto.');
        nextCandidates.push({file,buffer,doc});
      }
      models=nextModels;candidates=nextCandidates;
      $('#batch-model').replaceChildren(...models.map((f,i)=>new Option(f.name,String(i))));await chooseModel();
    } catch(error) {notify(error.message);$('#batch-status').textContent=error.message;}
    finally {e.target.value='';}
  };
}
