(() => {
  const words = {
    en: ['Get a quote','Chat on WhatsApp','Reply by','Email','WhatsApp','Quantity','Quotation','Enter a valid email address'],
    fr: ['Demander un devis','Discuter sur WhatsApp','Répondre par','E-mail','WhatsApp','Quantité','Devis','Saisissez une adresse e-mail valide'],
    ar: ['اطلب عرض سعر','تواصل عبر واتساب','الرد عبر','البريد الإلكتروني','واتساب','الكمية','نوع العرض','أدخل بريداً إلكترونياً صحيحاً'],
    fa: ['دریافت قیمت','گفتگو در واتساپ','پاسخ از طریق','ایمیل','واتساپ','تعداد','نوع قیمت','ایمیل معتبر وارد کنید'],
    ru: ['Запросить цену','Написать в WhatsApp','Ответить через','Эл. почта','WhatsApp','Количество','Тип цены','Введите корректный адрес почты'],
    es: ['Solicitar cotización','Chatear por WhatsApp','Responder por','Correo electrónico','WhatsApp','Cantidad','Cotización','Introduzca un correo válido'],
    zh: ['获取报价','WhatsApp 聊天','回复方式','邮箱','WhatsApp','数量','报价方式','请输入有效邮箱地址']
  };
  const copy = () => words[document.documentElement.lang.split('-')[0]] || words.en;
  const isolated = new URLSearchParams(location.search).has('daily_test_id');
  const quoteSelector = '[data-sales-quote], .js-inquiry-cta, .quote-link, [data-fob-cta], a[href="#contact"], a[href="#quote"]';
  const chatSelector = 'a[href*="wa.me/"],a[href="#contact-whatsapp"],[data-whatsapp-button="true"],.floating-whatsapp-btn,.whatsapp-btn';
  function field(form, name, title, type = 'text') {
    let input = form.elements.namedItem(name);
    if (input) return input;
    const label = document.createElement('label'), span = document.createElement('span');
    span.textContent = title;
    input = document.createElement('input'); input.name = name; input.type = type;
    label.append(span,input); (form.querySelector('.inquiry-fields') || form).append(label);
    return input;
  }
  function initForm(form) {
    if (form.dataset.channelsReady) return;
    form.dataset.channelsReady = 'true'; form.id ||= 'quote-form';
    const w = copy(), email = field(form,'email',w[3],'email');
    const emailSpan=email.closest('label')?.querySelector('span');if(emailSpan)emailSpan.textContent=w[3];
    const phone = form.elements.namedItem('phone_number'), code = form.elements.namedItem('calling_code');
    if (form.dataset.sourceEntry !== "car_sourcing") {
      const quantity = field(form,'quantity',w[5],'number'); quantity.min = '1'; quantity.step = '1';
      let quote = form.elements.namedItem('fobOrCif') || form.elements.namedItem('quoteType');
      if (!quote) {
        const label=document.createElement('label'), span=document.createElement('span');span.textContent=w[6];
        quote=document.createElement('select');quote.name='fobOrCif';
        for(const value of ['FOB','CIF']) quote.add(new Option(value,value));
        quote.value = /cif/i.test(location.pathname) ? 'CIF':'FOB';label.append(span,quote);(form.querySelector('.inquiry-fields') || form).append(label);
      }
    }
    const label=document.createElement('label'), span=document.createElement('span'), select=document.createElement('select');
    span.textContent=w[2];select.name='replyChannel';select.required=true;
    select.add(new Option(w[3],'email'));select.add(new Option(w[4],'whatsapp'));select.value='whatsapp';
    label.append(span,select);(form.querySelector('.inquiry-fields')||form).prepend(label);
    const update=()=>{
      const useEmail=select.value==='email'; email.required=useEmail; email.disabled=!useEmail;
      if(email.closest('label')) email.closest('label').hidden=!useEmail;
      for(const input of [phone,code]) if(input){input.disabled=useEmail;input.required=!useEmail;input.setCustomValidity('');if(input.closest('label'))input.closest('label').hidden=useEmail;}
      if(phone&&!useEmail)phone.dispatchEvent(new Event('change'));
    };
    select.addEventListener('change',update);update();
    form.addEventListener('input',()=>{form.dataset.draftStarted='true';});
    form.addEventListener('change',()=>{form.dataset.draftStarted='true';});
  }
  function enhance(root=document) {
    root.querySelectorAll?.('form.inquiry-form').forEach(initForm);
    root.querySelectorAll?.(chatSelector).forEach(link=>{
      if(link.closest('.zg-wa-dialog')||link.dataset.inquiryChatReady)return;
      if(link.tagName!=='A'){const anchor=document.createElement('a');for(const attr of link.attributes)anchor.setAttribute(attr.name,attr.value);anchor.textContent=link.textContent;link.replaceWith(anchor);link=anchor;}
      link.dataset.inquiryChatReady='true';link.setAttribute('data-whatsapp-direct','');
      // Use the existing official destination, including dynamically created legacy links.
      const original=link.dataset.chatUrl||link.dataset.originalWhatsappHref||link.getAttribute('href')||'';
      const match=original.match(/^https:\/\/wa\.me\/\d+/);
      const base=match?match[0]:'https://wa.me/8618661888866';
      link.dataset.chatUrl=base;link.href=isolated?'#quote-form':base;
      link.target='_blank';link.rel='noopener noreferrer';link.textContent=copy()[1];link.setAttribute('aria-label',copy()[1]);
    });
    root.querySelectorAll?.(quoteSelector).forEach(link=>{if(!link.matches(chatSelector)&&!link.closest('form'))if(link.textContent!==copy()[0])link.textContent=copy()[0];});
  }
  document.addEventListener('click',event=>{
    const link=event.target.closest(quoteSelector);
    if(!link||link.matches(chatSelector))return;
    const form=document.querySelector('form.inquiry-form');if(!form)return;
    event.preventDefault();event.stopImmediatePropagation();
    if(form.dataset.draftStarted!=='true'&&!form.dataset.quotePrefilled){
      const model=form.elements.namedItem('model');
      const value=link.dataset.title||link.dataset.vehicle||link.dataset.model;
      if(model&&value){model.value=value;model.dispatchEvent(new Event('change'));}
      if(link.dataset.vehicleId){
        for(const [name,value] of Object.entries({vehicle_id:link.dataset.vehicleId,vehicle_name:value,model_year:link.dataset.year,sale_price:link.dataset.price,inventory_type:link.dataset.inventoryType})){
          if(value){let input=form.elements.namedItem(name);if(!input){input=document.createElement('input');input.type='hidden';input.name=name;form.append(input);}input.value=value;}
        }
      }
      form.dataset.quotePrefilled='true';
    }
    document.querySelector('.main-nav')?.classList.remove('is-open');
    form.scrollIntoView({behavior:'smooth',block:'start'});form.querySelector('input:not([type="hidden"]):not([disabled]),select:not([disabled])')?.focus({preventScroll:true});
  },true);
  // One direct-click record, with attribution; no lead submission or automatic message send.
  document.addEventListener('click',event=>{
    const link=event.target.closest('[data-whatsapp-direct]');if(!link)return;
    event.stopImmediatePropagation();
    if(isolated){event.preventDefault();return;}
    const attribution=window.ZhongguTracking?.getAttribution()||null;
    const fromAd=[attribution?.first_ad_touch,attribution?.last_touch,attribution?.first_touch].some(t=>t?.gclid||t?.gbraid||t?.wbraid);
    const url=new URL(link.dataset.chatUrl||link.href);
    const existing=new URL(link.href).searchParams.get('text')||'';
    url.searchParams.set('text',existing.replace(/\[ZG-(?:WEB|ADS)\]/g,'').trim()+` [${fromAd?'ZG-ADS':'ZG-WEB'}]`);link.href=url.href;
    const body=JSON.stringify({eventType:'whatsapp_click',source:'whatsapp_click',sourceType:'whatsapp_click',sourceButton:link.dataset.source||'direct_whatsapp',sourcePage:location.pathname,sourceUrl:location.href,pageUrl:location.href,vehicle:link.dataset.vehicle||document.body.dataset.vehicleName||document.querySelector('h1')?.textContent,market:link.dataset.market||document.body.dataset.marketCountry,language:document.documentElement.lang,attribution});
    if(!navigator.sendBeacon?.('/api/whatsapp-clicks',new Blob([body],{type:'application/json'})))fetch('/api/whatsapp-clicks',{method:'POST',headers:{'Content-Type':'application/json'},body,keepalive:true}).catch(()=>{});
  },true);
  function localize(){
    const w=copy();document.querySelectorAll('form.inquiry-form').forEach(f=>{
      const submit=f.querySelector('button[type="submit"]');if(submit&&!submit.disabled)submit.textContent=w[0];
      for(const [name,title] of [['replyChannel',w[2]],['email',w[3]],['quantity',w[5]],['fobOrCif',w[6]]]){const span=f.querySelector(`[name="${name}"]`)?.closest('label')?.querySelector('span');if(span&&span.textContent!==title)span.textContent=title;}
      const options=f.querySelector('[name="replyChannel"]')?.options;if(options){options[0].textContent=w[3];options[1].textContent=w[4];}
      const lang=document.documentElement.lang.split('-')[0];
      const phoneWords={fr:['Indicatif WhatsApp','Numéro WhatsApp'],ar:['رمز دولة واتساب','رقم واتساب'],ru:['Код страны WhatsApp','Номер WhatsApp'],es:['Prefijo de WhatsApp','Número de WhatsApp'],fa:['کد کشور واتساپ','شماره واتساپ']}[lang];
      const codeSelect=f.querySelector('[name="calling_code"]');if(codeSelect?.options[0])codeSelect.options[0].textContent=({ar:'اختر رمز الدولة',fr:'Choisir un indicatif',ru:'Выберите код страны',es:'Seleccione el prefijo',fa:'کد کشور را انتخاب کنید'})[lang]||'Select country code';
      if(phoneWords)for(const [i,name] of ['calling_code','phone_number'].entries()){const span=f.querySelector(`[name="${name}"]`)?.closest('label')?.querySelector('span');if(span)span.textContent=phoneWords[i];}
    });
    document.querySelectorAll('[data-whatsapp-direct]').forEach(a=>{if(a.textContent!==w[1])a.textContent=w[1];a.setAttribute('aria-label',w[1]);});
    enhance();
  }
  enhance();localize();
  new MutationObserver(localize).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  new MutationObserver(records=>{if(records.some(r=>r.addedNodes.length))enhance();}).observe(document.body,{childList:true,subtree:true});
})();
