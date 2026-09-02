// Country-specific editorial content. No eligibility, stock or freight guarantee.
module.exports = ({ pageShell, contactSection, faqSchema, write, read, escapeHtml: e }) => {
  const markets = [
    {
      slug: 'egypt', country: 'Egypt', region: 'Africa',
      en: {
        title: 'Import Cars from China to Egypt | FOB, CIF & ACI Checklist',
        description: 'Compare China vehicle supply for Egypt. Prepare trim details, an FOB or CIF shipping inquiry and Nafeza ACI document checks before selecting export stock.',
        h1: 'Import Cars from China to Egypt',
        intro: 'Start with the importer and document route, then choose the vehicle. Zhonggu Auto Export supports China-side sourcing and quotation inquiries for Egyptian dealers and buyers comparing Geely, Bestune and other listed models. A China stock listing does not establish Egyptian import eligibility.',
        sections: [
          ['Choose the right sourcing route', '<p>Tell us whether the inquiry is for a dealership, fleet or personal purchase, and whether the vehicle must be new or may be used. Ask your Egyptian customs representative to confirm the applicable route before paying a deposit. Do not apply rules for one buyer category to a different type of shipment.</p><p>For a used-car inquiry, supply the permitted production and registration criteria from your representative. A low China-side price alone is not enough to select an importable unit.</p>'],
          ['Nafeza ACI and document preparation', '<p>Nafeza describes ACI as a pre-shipment cargo information process with an ACID shipment identifier. Coordinate the importer details, shipment data and document responsibilities with your Egyptian representative before loading. A quotation is not an ACID approval.</p><p>Read the <a href="https://www.nafeza.gov.eg/ar/pages/15">official Nafeza ACI guidance</a> and confirm current instructions for your shipment. Prepare the draft invoice, vehicle specification list, VIN or unit references and shipment details for review; the final document set depends on the import route.</p>'],
          ['FOB versus CIF: specify the Egyptian destination', '<p>For FOB, name the China departure port. For CIF, name the Egyptian port you want assessed, such as Alexandria or Sokhna, and give the quantity and purchasing timetable. These are quotation destinations, not a promise of a direct sailing or a fixed transit time.</p><p>Ask for separate vehicle, freight and insurance items, currency, validity and exclusions. Have your destination representative assess clearance, taxes, terminal costs and inland delivery to Cairo or your chosen city separately.</p>'],
          ['Compare new petrol and electric options', '<div class="seo-card-grid"><article class="seo-card"><h3>Geely Coolray / Binyue</h3><p>Check the exact trim, engine, equipment and production date. Battle and Full Option are not interchangeable specification names.</p><a href="/geely-coolray-battle-edition.html">Read Battle reference specifications</a></article><article class="seo-card"><h3>Bestune Yueyi 03 EV</h3><p>Compare the listed range versions, then confirm the charging connector, charging equipment, battery documentation and service arrangements for the selected unit.</p><a href="/bestune-yueyi-03-wholesale.html">Compare Yueyi 03 versions</a></article></div>']
        ],
        faqs: [
          ['Can every used car listed on your site be imported into Egypt?', 'No. The catalogue describes China-side sourcing options. Your importer or customs representative must confirm the applicable import route and the eligibility of the exact vehicle before purchase.'],
          ['Does an FOB price include shipping to Egypt?', 'Request a written cost breakdown. An FOB quotation and a CIF quotation refer to different delivery arrangements; ask for the named ports, included costs, validity and exclusions.'],
          ['What should I send for an Egypt quotation?', 'Send the buyer type, exact model and trim, new or used condition, quantity, preferred Egyptian port, budget currency and timing. Confirm document responsibilities before shipment.']
        ],
        cta: 'Request an Egypt Vehicle Quote',
        message: 'Please quote vehicles for Egypt. Buyer type: __; model/trim: __; new or used: __; quantity: __; destination port: __; timetable: __. Please separate vehicle and shipping costs and confirm document responsibilities.'
      },
      ar: {
        title: 'استيراد السيارات من الصين إلى مصر | عرض سعر وتجهيز مستندات ACI',
        description: 'قارن سيارات جيلي وبستيون من الصين لمصر، وحدد الفئة وميناء الوصول واطلب عرض FOB أو CIF مع مراجعة مستندات نافذة وأهلية الاستيراد قبل الشراء.',
        h1: 'استيراد السيارات من الصين إلى مصر',
        intro: 'ابدأ بتحديد صفة المستورد ومسار المستندات قبل اختيار السيارة. تساعد Zhonggu Auto Export في البحث عن السيارات وإعداد عروض الأسعار من الصين للتجار والمشترين في مصر. وجود السيارة في الكتالوج لا يعني الموافقة على استيرادها إلى مصر.',
        sections: [
          ['حدد مسار الشراء أولاً', '<p>وضح إن كان الطلب لتاجر أو أسطول أو للاستخدام الشخصي، وهل تبحث عن سيارة جديدة أم مستعملة. راجع الشروط الخاصة بحالتك مع ممثلك الجمركي في مصر قبل دفع العربون؛ لا تفترض أن قواعد فئة من المستوردين تنطبق على فئة أخرى.</p><p>للسيارات المستعملة، اطلب تأكيد متطلبات تاريخ الإنتاج وأول تسجيل قبل اختيار الوحدة. انخفاض السعر في الصين وحده لا يثبت أهلية الاستيراد.</p>'],
          ['نافذة وملف ACI قبل الشحن', '<p>توضح منصة نافذة أن ACI إجراء لتقديم بيانات الشحنة مسبقاً والحصول على الرقم التعريفي ACID. نسق بيانات المستورد والشحنة ومسؤولية تجهيز المستندات قبل التحميل. عرض السعر لا يمثل موافقة ACID.</p><p>راجع <a href="https://www.nafeza.gov.eg/ar/pages/15">إرشادات نافذة الرسمية</a> والتعليمات السارية لشحنتك. جهز الفاتورة المبدئية وقائمة المواصفات وأرقام VIN أو مراجع الوحدات وتفاصيل الشحن للمراجعة؛ تختلف المستندات النهائية حسب مسار الاستيراد.</p>'],
          ['عرض FOB أو CIF إلى الميناء المصري', '<p>حدد ميناء المغادرة في الصين لعرض FOB. ولعرض CIF، اذكر الميناء المطلوب تقييم الشحن إليه، مثل الإسكندرية أو السخنة، مع الكمية وموعد الشراء. هذه وجهات لطلب التسعير وليست ضماناً لرحلة مباشرة أو مدة شحن ثابتة.</p><p>اطلب فصل قيمة السيارة والشحن والتأمين وبيان العملة والصلاحية والاستثناءات. راجع التخليص والضرائب ورسوم الميناء والنقل إلى القاهرة أو مدينتك مع ممثلك في مصر بصورة منفصلة.</p>'],
          ['قارن الفئة والمحرك وتجهيزات الشحن الكهربائي', '<div class="seo-card-grid"><article class="seo-card"><h3>جيلي كولراي / بينيو</h3><p>راجع الفئة والمحرك وتاريخ الإنتاج والتجهيزات. لا تستخدم مواصفات Full Option لتأكيد مواصفات Battle.</p><a href="/geely-coolray-battle-edition.html">مواصفات Battle المرجعية بالإنجليزية</a></article><article class="seo-card"><h3>بستيون Yueyi 03 الكهربائية</h3><p>قارن نسخ المدى، ثم أكد نوع منفذ الشحن والشاحن ووثائق البطارية وترتيبات الخدمة للوحدة المختارة.</p><a href="/bestune-yueyi-03-wholesale.html">مقارنة نسخ Yueyi 03 بالإنجليزية</a></article></div>']
        ],
        faqs: [
          ['هل يمكن استيراد كل سيارة مستعملة معروضة إلى مصر؟', 'لا. الكتالوج يعرض خيارات توريد من الصين. يجب تأكيد مسار الاستيراد وأهلية السيارة المحددة مع المستورد أو الممثل الجمركي قبل الشراء.'],
          ['هل يشمل سعر FOB الشحن إلى مصر؟', 'اطلب بيان تكلفة مكتوباً. ترتيبات عرض FOB تختلف عن CIF؛ أكد الموانئ والتكاليف المشمولة والصلاحية والاستثناءات.'],
          ['ما المعلومات المطلوبة لعرض مصر؟', 'صفة المشتري، الموديل والفئة، جديدة أو مستعملة، الكمية، الميناء المصري، عملة الميزانية والموعد المطلوب. أكد مسؤوليات المستندات قبل الشحن.']
        ],
        cta: 'اطلب عرض سيارة إلى مصر',
        message: 'أرغب في عرض سيارات لمصر. صفة المشتري: __؛ الموديل والفئة: __؛ جديدة أو مستعملة: __؛ الكمية: __؛ ميناء الوصول: __؛ الموعد: __. يرجى فصل تكلفة السيارة والشحن وتأكيد مسؤوليات المستندات.'
      }
    },
    {
      slug: 'iraq', country: 'Iraq', region: 'Middle East',
      en: {
        title: 'Import Cars from China to Iraq | Umm Qasr Quote Checklist',
        description: 'Source China vehicles for Iraq with model, VIN and conformity checks. Request itemized FOB or CIF pricing to Umm Qasr and clarify onward delivery requirements.',
        h1: 'Import Cars from China to Iraq',
        intro: 'Build an Iraq sourcing shortlist around the exact model, documents and delivery destination. Zhonggu Auto Export can receive dealer, fleet and individual vehicle inquiries from Iraq and check China-side options. Availability, import eligibility and shipment arrangements must be confirmed for the selected units.',
        sections: [
          ['Define the destination beyond the port', '<p>For a sea-freight inquiry, tell us whether you want a quotation to Umm Qasr and identify the final delivery city, such as Basra or Baghdad. If your receiving point is Erbil or another destination, state the intended entry point and onward route instead of assuming the same clearance and inland-delivery arrangements.</p><p>Ask your receiving agent to confirm which party handles terminal charges, release and onward transport. A port quotation does not by itself confirm door delivery, an open route or a shipping date.</p>'],
          ['Confirm conformity before selecting stock', '<p>Send the exact trim, production date, VIN or unit reference, engine and fuel type to your licensed Iraqi representative for review. Confirm the current import and registration requirements for your entry point before purchase.</p><p>Use the <a href="https://www.cosqc.gov.iq/">Iraqi Central Organization for Standardization and Quality Control (COSQC)</a> as an official starting point for standards enquiries. A China-market configuration sheet is not proof of Iraqi conformity or registration approval. This page does not promise a model-year allowance, a tax rate or an approval certificate.</p>'],
          ['Petrol SUV and sedan comparison', '<div class="seo-card-grid"><article class="seo-card"><h3>Geely Coolray Battle</h3><p>Review the China-market reference specifications, then confirm the actual engine, transmission, cooling equipment, infotainment language and parts support. We do not label an unverified unit as a Gulf-spec vehicle.</p><a href="/geely-coolray-battle-edition.html">Read Coolray Battle specifications</a></article><article class="seo-card"><h3>Used Bestune B70</h3><p>Compare the China-side 2021-2023 listings only after your representative confirms the eligible production and registration criteria. Request exact mileage, condition evidence and VIN details.</p><a href="/used-bestune-b70-wholesale.html">Review B70 stock and buyer checks</a></article></div>'],
          ['Prepare an itemized FOB or CIF request', '<p>Include model and trim, new or used condition, quantity, target currency, China departure port if known, Iraqi entry point, final city and purchase timing. Ask for separate vehicle, freight and insurance items, validity and exclusions.</p><p>For used vehicles, compare the condition and available records of each unit rather than treating a batch price as an identical specification. For EV enquiries, confirm the charging interface, equipment and service arrangements before choosing a version. Request current routing and freight availability; no fixed sailing or transit time is advertised here.</p>']
        ],
        faqs: [
          ['Can I request CIF pricing to Umm Qasr?', 'Yes, you can request a quotation assessment with the model, quantity and timing. Current routing, freight availability, insurance and the final written scope must be confirmed before booking.'],
          ['Are your China-market vehicles automatically approved for Iraq?', 'No. Confirm the exact vehicle and current conformity, import and registration requirements with your Iraqi representative and the relevant authorities before order.'],
          ['Does the quotation include delivery to Baghdad or Erbil?', 'Do not assume inland delivery is included. State your final city and entry point and ask for the onward route, responsibilities and costs to be confirmed separately.']
        ],
        cta: 'Request an Iraq Vehicle Quote',
        message: 'Please quote vehicles for Iraq. Model/trim: __; new or used: __; quantity: __; entry port: __; final city: __; timetable: __. Please separate vehicle, sea freight and onward delivery costs and list documents available.'
      },
      ar: {
        title: 'استيراد السيارات من الصين إلى العراق | عرض شحن إلى أم قصر',
        description: 'توريد سيارات من الصين للعراق مع مراجعة الفئة ورقم VIN والمطابقة. اطلب عرض FOB أو CIF إلى أم قصر وحدد متطلبات النقل إلى مدينتك قبل الشراء.',
        h1: 'استيراد السيارات من الصين إلى العراق',
        intro: 'ابدأ بتحديد السيارة والمستندات ووجهة التسليم. تستقبل Zhonggu Auto Export طلبات التجار والأساطيل والأفراد في العراق للتحقق من خيارات التوريد من الصين. يجب تأكيد التوفر وأهلية الاستيراد وترتيبات الشحن للوحدات المختارة.',
        sections: [
          ['حدد وجهة التسليم بعد الميناء', '<p>لطلب الشحن البحري، وضح إن كنت تريد تقييم عرض إلى أم قصر، واذكر المدينة النهائية مثل البصرة أو بغداد. وإذا كانت الوجهة أربيل أو مدينة أخرى، حدد منفذ الدخول والمسار المطلوب بدلاً من افتراض تطابق إجراءات التخليص والنقل الداخلي.</p><p>أكد مع وكيل الاستلام الجهة المسؤولة عن رسوم المحطة والإفراج والنقل اللاحق. عرض الوصول إلى الميناء لا يعني تلقائياً التسليم إلى الباب أو تأكيد توفر المسار وموعد الشحن.</p>'],
          ['راجع المطابقة قبل اختيار المخزون', '<p>أرسل الفئة الدقيقة وتاريخ الإنتاج ورقم VIN أو مرجع الوحدة والمحرك ونوع الوقود إلى ممثلك العراقي المرخص. أكد متطلبات الاستيراد والتسجيل السارية لمنفذ الدخول قبل الشراء.</p><p>يمكن الرجوع إلى <a href="https://www.cosqc.gov.iq/">الجهاز المركزي للتقييس والسيطرة النوعية</a> للاستفسار الرسمي عن المواصفات. ورقة تجهيزات السوق الصينية لا تثبت المطابقة العراقية أو الموافقة على التسجيل. لا تقدم هذه الصفحة ضماناً لسنوات الموديل المسموح بها أو نسبة الضريبة أو شهادة اعتماد.</p>'],
          ['قارن سيارات البنزين حسب الوحدة', '<div class="seo-card-grid"><article class="seo-card"><h3>جيلي كولراي Battle</h3><p>راجع المواصفات المرجعية ثم أكد المحرك وناقل الحركة وتجهيزات التبريد ولغة النظام وتوفر القطع. لا نصف سيارة غير موثقة بأنها ذات مواصفات خليجية.</p><a href="/geely-coolray-battle-edition.html">مواصفات Battle بالإنجليزية</a></article><article class="seo-card"><h3>بستيون B70 المستعملة</h3><p>راجع عروض الصين لموديلات 2021-2023 فقط بعد تأكيد شروط الإنتاج والتسجيل المناسبة مع ممثلك. اطلب المسافة الفعلية وأدلة الحالة ورقم VIN.</p><a href="/used-bestune-b70-wholesale.html">مقارنة B70 وفحص الشراء بالإنجليزية</a></article></div>'],
          ['جهز طلب سعر مفصلاً', '<p>اذكر الموديل والفئة، جديدة أو مستعملة، الكمية، العملة، ميناء المغادرة إن كان معروفاً، منفذ الدخول العراقي، المدينة النهائية وموعد الشراء. اطلب فصل قيمة السيارة والشحن والتأمين مع صلاحية العرض والاستثناءات.</p><p>للسيارات المستعملة، قارن حالة وسجلات كل وحدة؛ سعر الدفعة لا يعني تطابق التجهيزات. وللكهربائية، أكد منفذ الشحن والشاحن وترتيبات الخدمة. اطلب تأكيد المسار وتوفر الشحن الحالي؛ لا نعلن مدة وصول أو إبحار ثابتة.</p>']
        ],
        faqs: [
          ['هل يمكن طلب سعر CIF إلى أم قصر؟', 'نعم، أرسل الموديل والكمية والموعد لتقييم العرض. يجب تأكيد المسار وتوفر الشحن والتأمين والنطاق المكتوب قبل الحجز.'],
          ['هل سيارات السوق الصينية معتمدة تلقائياً للعراق؟', 'لا. أكد السيارة المحددة وشروط المطابقة والاستيراد والتسجيل الحالية مع ممثلك العراقي والجهات المختصة قبل الطلب.'],
          ['هل يشمل العرض التسليم إلى بغداد أو أربيل؟', 'لا تفترض شمول النقل الداخلي. حدد المدينة ومنفذ الدخول واطلب تأكيد المسار والمسؤوليات والتكاليف بصورة منفصلة.']
        ],
        cta: 'اطلب عرض سيارة إلى العراق',
        message: 'أرغب في عرض سيارات للعراق. الموديل والفئة: __؛ جديدة أو مستعملة: __؛ الكمية: __؛ منفذ الدخول: __؛ المدينة النهائية: __؛ الموعد: __. يرجى فصل تكلفة السيارة والشحن البحري والنقل الداخلي وذكر المستندات المتاحة.'
      }
    }
  ];
  for (const market of markets) for (const lang of ['en', 'ar']) {
    const text = market[lang], ar = lang === 'ar';
    const base = `export-cars-from-china-to-${market.slug}.html`;
    const pagePath = ar ? `ar/${base}` : base;
    let contact = contactSection({ heading: text.cta, intro: ar ? 'أرسل التفاصيل لنتحقق من خيارات التوريد والعرض الحالي.' : 'Send your requirements so we can check sourcing options and a current quotation.', model: text.h1, message: text.message, sourcePath: pagePath, country: market.country, region: market.region, language: lang, button: text.cta });
    if (ar) for (const [from, to] of [['Contact Zhonggu Auto Export','تواصل مع Zhonggu Auto Export'],['Send Inquiry','أرسل طلبك'],['<span>Name</span>','<span>الاسم</span>'],['<span>Country</span>','<span>الدولة</span>'],['<span>Interested Model</span>','<span>الموديل المطلوب</span>'],['<span>Message</span>','<span>الرسالة</span>'],[' on WhatsApp ',' — واتساب '],['Thank you, your inquiry has been received.','شكراً، تم استلام طلبك.']]) contact = contact.replaceAll(from,to);
    const body = `<section class="seo-hero"><div class="container"><nav class="language-switcher" aria-label="${ar ? 'اختيار اللغة' : 'Language selector'}"><a href="/${base}" lang="en" hreflang="en">English</a><a href="/ar/${base}" lang="ar" hreflang="ar">العربية</a></nav><p class="eyebrow">${ar ? 'توريد سيارات من الصين' : 'China vehicle sourcing'}</p><h1>${e(text.h1)}</h1><p>${e(text.intro)}</p><a class="btn btn-primary js-inquiry-cta" href="#contact" data-title="${e(text.h1)}">${e(text.cta)}</a></div></section>
${text.sections.map(([heading, html])=>`<section class="seo-section"><div class="container"><h2>${e(heading)}</h2>${html}</div></section>`).join('\n')}
<section class="seo-section"><div class="container"><h2>${ar ? 'أسئلة قبل الشراء والشحن' : 'Questions Before Purchase and Shipping'}</h2><div class="faq-list">${text.faqs.map(([q,a])=>`<article class="faq-item"><h3>${e(q)}</h3><p>${e(a)}</p></article>`).join('')}</div></div></section>
<section class="seo-section"><div class="container"><h2>${ar ? 'موارد التوريد والأسواق' : 'Sourcing Resources and Markets'}</h2><nav class="market-link-grid" aria-label="${ar ? 'الأسواق ذات الصلة' : 'Related markets'}"><a href="/car-importer-center.html">${ar ? 'مركز المستوردين بالإنجليزية' : 'Importer center'}</a><a href="/${ar ? 'ar/' : ''}export-cars-from-china-to-egypt.html">${ar ? 'مصر' : 'Egypt'}</a><a href="/${ar ? 'ar/' : ''}export-cars-from-china-to-iraq.html">${ar ? 'العراق' : 'Iraq'}</a><a href="/${ar ? 'ar/' : ''}export-cars-from-china-to-algeria.html">${ar ? 'الجزائر' : 'Algeria'}</a></nav></div></section>${contact}`;
    let html = pageShell({lang, title:text.title, description:text.description, path:pagePath, h1:text.h1, bodyClass:'regional-market-page localized-market-page', market:market.country, body,
      hreflangs:[{lang:'en',href:`https://zhongguauto.com/${base}`},{lang:'ar',href:`https://zhongguauto.com/ar/${base}`},{lang:'x-default',href:`https://zhongguauto.com/${base}`}],
      schema:[{'@type':'Service',name:text.h1,description:text.description,url:`https://zhongguauto.com/${pagePath}`,areaServed:{'@type':'Country',name:market.country},provider:{'@id':'https://zhongguauto.com/#organization'}},faqSchema(text.faqs)]});
    if (ar) for (const [from,to] of [['>Home<','>الرئيسية<'],['>New Cars<','>سيارات جديدة<'],['>Used Cars<','>سيارات مستعملة<'],['>Brands<','>العلامات<'],['>Company<','>الشركة<'],['>Export Process<','>إجراءات التصدير<'],['>Contact Us<','>تواصل معنا<']]) html=html.replaceAll(from,to);
    write(pagePath,html);
  }
  const hub='car-importer-center.html';
  const links='<section class="seo-section" id="egypt-iraq-sourcing"><div class="container"><h2>Egypt and Iraq Sourcing Guides</h2><div class="seo-card-grid"><article class="seo-card"><h3>Egypt: importer route and ACI preparation</h3><p>Plan the vehicle, document responsibilities and a named Egyptian port before asking for shipment pricing.</p><a href="/export-cars-from-china-to-egypt.html">Egypt import and quotation checklist</a></article><article class="seo-card"><h3>Iraq: entry point and conformity checks</h3><p>Identify the exact unit, destination and onward delivery scope before selecting stock.</p><a href="/export-cars-from-china-to-iraq.html">Iraq sourcing and Umm Qasr quotation checklist</a></article></div></div></section>';
  write(hub,read(hub).replace('</main>',`${links}</main>`));
};
