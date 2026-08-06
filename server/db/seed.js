const { getDb, closeDb } = require('./database');

function seed() {
  const db = getDb();

  // Clear existing data
  db.exec('DELETE FROM essay_submissions');
  db.exec('DELETE FROM user_word_progress');
  db.exec('DELETE FROM writing_questions');
  db.exec('DELETE FROM words');

  // Reset user & autoincrement counter so user_id=1 always works
  db.exec("DELETE FROM users");
  db.exec("DELETE FROM sqlite_sequence WHERE name='users'");
  db.exec("INSERT INTO users (username) VALUES ('default')");

  // ======== 250+ WORDS ========
  const words = [
    // === EDUCATION (32 words) ===
    { word: 'curriculum', phonetic: '/kəˈrɪkjələm/', pos: 'n.', cn: '课程', topic: 'education', eg: 'The school has introduced a new curriculum for science subjects.', eg_cn: '学校为科学科目引入了新课程。', diff: 2, src: 'Cambridge IELTS 8 Test 1' },
    { word: 'pedagogy', phonetic: '/ˈpedəɡɒdʒi/', pos: 'n.', cn: '教学法', topic: 'education', eg: 'Modern pedagogy emphasizes student-centered learning approaches.', eg_cn: '现代教学法强调以学生为中心的学习方式。', diff: 4, src: 'Cambridge IELTS 9 Test 2' },
    { word: 'literacy', phonetic: '/ˈlɪtərəsi/', pos: 'n.', cn: '读写能力；素养', topic: 'education', eg: 'Improving adult literacy rates remains a key government priority.', eg_cn: '提高成年人识字率仍然是政府的一个关键优先事项。', diff: 2, src: 'Cambridge IELTS 10 Test 3' },
    { word: 'cognitive', phonetic: '/ˈkɒɡnətɪv/', pos: 'adj.', cn: '认知的', topic: 'education', eg: 'Cognitive development in early childhood is crucial for later academic success.', eg_cn: '儿童早期的认知发展对以后的学业成功至关重要。', diff: 3, src: 'Cambridge IELTS 11 Test 1' },
    { word: 'dissertation', phonetic: '/ˌdɪsəˈteɪʃən/', pos: 'n.', cn: '论文；学位论文', topic: 'education', eg: 'She spent two years writing her doctoral dissertation on climate change policy.', eg_cn: '她花了两年时间撰写关于气候变化政策的博士论文。', diff: 3, src: 'Cambridge IELTS 12 Test 2' },
    { word: 'scholarship', phonetic: '/ˈskɒləʃɪp/', pos: 'n.', cn: '奖学金；学术成就', topic: 'education', eg: 'He was awarded a full scholarship to study at Oxford University.', eg_cn: '他获得了全额奖学金去牛津大学学习。', diff: 1, src: 'Cambridge IELTS 7 Test 4' },
    { word: 'vocational', phonetic: '/vəʊˈkeɪʃənəl/', pos: 'adj.', cn: '职业的', topic: 'education', eg: 'Vocational training programs prepare students for specific careers.', eg_cn: '职业培训项目为学生准备特定的职业。', diff: 2, src: 'Cambridge IELTS 9 Test 3' },
    { word: 'tuition', phonetic: '/tjuːˈɪʃən/', pos: 'n.', cn: '学费；教学', topic: 'education', eg: 'University tuition fees have increased significantly over the past decade.', eg_cn: '大学学费在过去十年中大幅上涨。', diff: 1, src: 'Cambridge IELTS 11 Test 4' },
    { word: 'syllabus', phonetic: '/ˈsɪləbəs/', pos: 'n.', cn: '教学大纲', topic: 'education', eg: 'The exam covers everything in the course syllabus.', eg_cn: '考试涵盖课程大纲中的所有内容。', diff: 2, src: 'Cambridge IELTS 8 Test 2' },
    { word: 'plagiarism', phonetic: '/ˈpleɪdʒərɪzəm/', pos: 'n.', cn: '剽窃；抄袭', topic: 'education', eg: 'Universities use sophisticated software to detect plagiarism in student essays.', eg_cn: '大学使用复杂的软件来检测学生论文中的剽窃行为。', diff: 3, src: 'Cambridge IELTS 10 Test 1' },
    { word: 'compulsory', phonetic: '/kəmˈpʌlsəri/', pos: 'adj.', cn: '强制性的；必修的', topic: 'education', eg: 'Education is compulsory for all children between the ages of 5 and 16.', eg_cn: '教育对所有5到16岁的儿童是强制性的。', diff: 2, src: 'Cambridge IELTS 6 Test 2' },
    { word: 'undergraduate', phonetic: '/ˌʌndəˈɡrædʒuət/', pos: 'n./adj.', cn: '本科生（的）', topic: 'education', eg: 'Undergraduate students are expected to attend all lectures and tutorials.', eg_cn: '本科学生应参加所有讲座和辅导课。', diff: 1, src: 'Cambridge IELTS 7 Test 1' },
    { word: 'postgraduate', phonetic: '/ˌpəʊstˈɡrædʒuət/', pos: 'n./adj.', cn: '研究生（的）', topic: 'education', eg: 'Postgraduate research often requires extensive laboratory work.', eg_cn: '研究生研究通常需要大量的实验室工作。', diff: 2, src: 'Cambridge IELTS 9 Test 4' },
    { word: 'eligible', phonetic: '/ˈelɪdʒəbəl/', pos: 'adj.', cn: '有资格的；符合条件的', topic: 'education', eg: 'Only students with high grades are eligible for the exchange program.', eg_cn: '只有成绩高的学生才有资格参加交换项目。', diff: 2, src: 'Cambridge IELTS 12 Test 3' },
    { word: 'diligent', phonetic: '/ˈdɪlɪdʒənt/', pos: 'adj.', cn: '勤奋的', topic: 'education', eg: 'Diligent students tend to achieve better results in examinations.', eg_cn: '勤奋的学生往往在考试中取得更好的成绩。', diff: 2, src: 'Cambridge IELTS 8 Test 3' },
    { word: 'cram', phonetic: '/kræm/', pos: 'v.', cn: '死记硬背；填鸭式学习', topic: 'education', eg: 'Many students cram for exams rather than studying consistently.', eg_cn: '许多学生考前突击而不是持续学习。', diff: 2, src: 'Cambridge IELTS 10 Test 2' },
    { word: 'semester', phonetic: '/sɪˈmestə/', pos: 'n.', cn: '学期', topic: 'education', eg: 'The fall semester begins in September and ends in December.', eg_cn: '秋季学期从九月开始到十二月结束。', diff: 1, src: 'Cambridge IELTS 6 Test 3' },
    { word: 'proficiency', phonetic: '/prəˈfɪʃənsi/', pos: 'n.', cn: '熟练；精通', topic: 'education', eg: 'English language proficiency is a requirement for international students.', eg_cn: '英语语言能力是国际学生的要求。', diff: 3, src: 'Cambridge IELTS 11 Test 3' },
    { word: 'academic', phonetic: '/ˌækəˈdemɪk/', pos: 'adj.', cn: '学术的', topic: 'education', eg: 'Academic research contributes to the advancement of knowledge.', eg_cn: '学术研究有助于知识的进步。', diff: 1, src: 'Cambridge IELTS 7 Test 2' },
    { word: 'discipline', phonetic: '/ˈdɪsəplɪn/', pos: 'n.', cn: '学科；纪律', topic: 'education', eg: 'Self-discipline is essential for distance learning success.', eg_cn: '自律对于远程学习的成功至关重要。', diff: 2, src: 'Cambridge IELTS 9 Test 1' },
    { word: 'tutorial', phonetic: '/tjuːˈtɔːriəl/', pos: 'n.', cn: '辅导课；教程', topic: 'education', eg: 'Small group tutorials provide opportunities for in-depth discussion.', eg_cn: '小组辅导课提供了深入讨论的机会。', diff: 1, src: 'Cambridge IELTS 8 Test 4' },
    { word: 'thesis', phonetic: '/ˈθiːsɪs/', pos: 'n.', cn: '论文；论点', topic: 'education', eg: 'Her thesis argues that early intervention improves educational outcomes.', eg_cn: '她的论文论证早期干预可以提高教育成果。', diff: 3, src: 'Cambridge IELTS 12 Test 1' },
    { word: 'mentor', phonetic: '/ˈmentɔː/', pos: 'n./v.', cn: '导师；指导', topic: 'education', eg: 'Each new teacher is assigned an experienced mentor for support.', eg_cn: '每位新教师都会被分配一位有经验的导师提供支持。', diff: 2, src: 'Cambridge IELTS 10 Test 4' },
    { word: 'attain', phonetic: '/əˈteɪn/', pos: 'v.', cn: '达到；获得', topic: 'education', eg: 'Students work hard to attain the grades required for university admission.', eg_cn: '学生努力学习以达到大学录取所需的成绩。', diff: 2, src: 'Cambridge IELTS 11 Test 2' },
    { word: 'comprehend', phonetic: '/ˌkɒmprɪˈhend/', pos: 'v.', cn: '理解；领悟', topic: 'education', eg: 'The ability to comprehend complex texts is essential for academic success.', eg_cn: '理解复杂文本的能力对学业成功至关重要。', diff: 2, src: 'Cambridge IELTS 9 Test 2' },
    { word: 'assessment', phonetic: '/əˈsesmənt/', pos: 'n.', cn: '评估；评定', topic: 'education', eg: 'Continuous assessment is used alongside final examinations.', eg_cn: '持续评估与期末考试一起使用。', diff: 1, src: 'Cambridge IELTS 8 Test 1' },
    { word: 'prerequisite', phonetic: '/priːˈrekwɪzɪt/', pos: 'n.', cn: '先决条件；前提', topic: 'education', eg: 'A bachelor degree is a prerequisite for most masters programs.', eg_cn: '学士学位是大多数硕士课程的先决条件。', diff: 3, src: 'Cambridge IELTS 12 Test 4' },
    { word: 'stimulate', phonetic: '/ˈstɪmjuleɪt/', pos: 'v.', cn: '刺激；激发', topic: 'education', eg: 'Interactive lessons stimulate student engagement and curiosity.', eg_cn: '互动课程激发学生的参与度和好奇心。', diff: 2, src: 'Cambridge IELTS 7 Test 3' },
    { word: 'deduce', phonetic: '/dɪˈdjuːs/', pos: 'v.', cn: '推断；演绎', topic: 'education', eg: 'From the data, researchers could deduce significant trends.', eg_cn: '从数据中，研究人员可以推断出重要趋势。', diff: 3, src: 'Cambridge IELTS 10 Test 3' },
    { word: 'perceive', phonetic: '/pəˈsiːv/', pos: 'v.', cn: '感知；理解', topic: 'education', eg: 'Students perceive difficult subjects differently based on their learning styles.', eg_cn: '学生根据他们的学习风格以不同方式理解难学科目。', diff: 2, src: 'Cambridge IELTS 11 Test 1' },
    { word: 'intellectual', phonetic: '/ˌɪntəˈlektʃuəl/', pos: 'adj.', cn: '智力的；知识的', topic: 'education', eg: 'Intellectual curiosity drives scientific discovery and innovation.', eg_cn: '求知欲推动科学发现和创新。', diff: 3, src: 'Cambridge IELTS 9 Test 3' },
    { word: 'elucidate', phonetic: '/ɪˈluːsɪdeɪt/', pos: 'v.', cn: '阐明；解释', topic: 'education', eg: 'The professor used diagrams to elucidate the complex theory.', eg_cn: '教授用图表来阐明这个复杂的理论。', diff: 5, src: 'Cambridge IELTS 13 Test 1' },

    // === ENVIRONMENT (32 words) ===
    { word: 'sustainable', phonetic: '/səˈsteɪnəbəl/', pos: 'adj.', cn: '可持续的', topic: 'environment', eg: 'Sustainable development balances economic growth with environmental protection.', eg_cn: '可持续发展平衡经济增长与环境保护。', diff: 2, src: 'Cambridge IELTS 7 Test 3' },
    { word: 'biodiversity', phonetic: '/ˌbaɪəʊdaɪˈvɜːsəti/', pos: 'n.', cn: '生物多样性', topic: 'environment', eg: 'The loss of biodiversity threatens ecosystem stability worldwide.', eg_cn: '生物多样性的丧失威胁着全球生态系统的稳定。', diff: 3, src: 'Cambridge IELTS 9 Test 1' },
    { word: 'conservation', phonetic: '/ˌkɒnsəˈveɪʃən/', pos: 'n.', cn: '保护；保存', topic: 'environment', eg: 'Wildlife conservation efforts have helped save endangered species.', eg_cn: '野生动物保护工作帮助拯救了濒危物种。', diff: 2, src: 'Cambridge IELTS 8 Test 4' },
    { word: 'emission', phonetic: '/ɪˈmɪʃən/', pos: 'n.', cn: '排放；排放物', topic: 'environment', eg: 'Carbon dioxide emissions from vehicles contribute to global warming.', eg_cn: '车辆排放的二氧化碳导致全球变暖。', diff: 2, src: 'Cambridge IELTS 10 Test 2' },
    { word: 'renewable', phonetic: '/rɪˈnjuːəbəl/', pos: 'adj.', cn: '可再生的', topic: 'environment', eg: 'Renewable energy sources such as solar and wind are becoming more affordable.', eg_cn: '太阳能和风能等可再生能源正变得更加实惠。', diff: 2, src: 'Cambridge IELTS 11 Test 1' },
    { word: 'deforestation', phonetic: '/diːˌfɒrɪˈsteɪʃən/', pos: 'n.', cn: '森林砍伐', topic: 'environment', eg: 'Deforestation in the Amazon rainforest has accelerated in recent years.', eg_cn: '亚马逊雨林的森林砍伐近年来加速了。', diff: 3, src: 'Cambridge IELTS 12 Test 3' },
    { word: 'ecosystem', phonetic: '/ˈiːkəʊˌsɪstəm/', pos: 'n.', cn: '生态系统', topic: 'environment', eg: 'Coral reefs are among the most diverse ecosystems on Earth.', eg_cn: '珊瑚礁是地球上最具多样性的生态系统之一。', diff: 2, src: 'Cambridge IELTS 9 Test 2' },
    { word: 'pollutant', phonetic: '/pəˈluːtənt/', pos: 'n.', cn: '污染物', topic: 'environment', eg: 'Industrial pollutants have contaminated the river system.', eg_cn: '工业污染物已污染了河流系统。', diff: 2, src: 'Cambridge IELTS 8 Test 3' },
    { word: 'degradation', phonetic: '/ˌdeɡrəˈdeɪʃən/', pos: 'n.', cn: '退化；恶化', topic: 'environment', eg: 'Soil degradation reduces agricultural productivity.', eg_cn: '土壤退化降低了农业生产力。', diff: 3, src: 'Cambridge IELTS 10 Test 4' },
    { word: 'catastrophe', phonetic: '/kəˈtæstrəfi/', pos: 'n.', cn: '灾难；大祸', topic: 'environment', eg: 'Climate change could lead to environmental catastrophe if left unchecked.', eg_cn: '如果不加以控制，气候变化可能导致环境灾难。', diff: 3, src: 'Cambridge IELTS 11 Test 2' },
    { word: 'drought', phonetic: '/draʊt/', pos: 'n.', cn: '干旱', topic: 'environment', eg: 'Prolonged drought has devastated agricultural production in the region.', eg_cn: '长期干旱摧毁了该地区的农业生产。', diff: 2, src: 'Cambridge IELTS 7 Test 4' },
    { word: 'flora', phonetic: '/ˈflɔːrə/', pos: 'n.', cn: '植物群', topic: 'environment', eg: 'The island boasts a unique flora found nowhere else on Earth.', eg_cn: '这个岛屿拥有地球上其他地方找不到的独特植物群。', diff: 3, src: 'Cambridge IELTS 12 Test 2' },
    { word: 'fauna', phonetic: '/ˈfɔːnə/', pos: 'n.', cn: '动物群', topic: 'environment', eg: 'The fauna of the Arctic region has adapted to extreme cold.', eg_cn: '北极地区的动物群已经适应了极端寒冷。', diff: 3, src: 'Cambridge IELTS 12 Test 2' },
    { word: 'ecology', phonetic: '/ɪˈkɒlədʒi/', pos: 'n.', cn: '生态学', topic: 'environment', eg: 'Ecology examines the relationships between organisms and their environment.', eg_cn: '生态学研究生物体与其环境之间的关系。', diff: 2, src: 'Cambridge IELTS 9 Test 4' },
    { word: 'erosion', phonetic: '/ɪˈrəʊʒən/', pos: 'n.', cn: '侵蚀；腐蚀', topic: 'environment', eg: 'Coastal erosion has destroyed several beachfront properties.', eg_cn: '海岸侵蚀已经摧毁了几处海滨房产。', diff: 3, src: 'Cambridge IELTS 8 Test 1' },
    { word: 'fossil', phonetic: '/ˈfɒsəl/', pos: 'n./adj.', cn: '化石；化石的', topic: 'environment', eg: 'Fossil fuel consumption remains the primary source of greenhouse gases.', eg_cn: '化石燃料消费仍然是温室气体的主要来源。', diff: 1, src: 'Cambridge IELTS 10 Test 1' },
    { word: 'exhaust', phonetic: '/ɪɡˈzɔːst/', pos: 'n./v.', cn: '废气；耗尽', topic: 'environment', eg: 'Car exhaust fumes contain harmful chemicals that pollute the air.', eg_cn: '汽车尾气含有污染空气的有害化学物质。', diff: 2, src: 'Cambridge IELTS 11 Test 3' },
    { word: 'discharge', phonetic: '/ˈdɪstʃɑːdʒ/', pos: 'v./n.', cn: '排放；流出', topic: 'environment', eg: 'Factories were fined for discharging toxic waste into the river.', eg_cn: '工厂因向河流排放有毒废物而被罚款。', diff: 3, src: 'Cambridge IELTS 7 Test 2' },
    { word: 'deteriorate', phonetic: '/dɪˈtɪəriəreɪt/', pos: 'v.', cn: '恶化；退化', topic: 'environment', eg: 'Air quality has deteriorated significantly in many urban areas.', eg_cn: '许多城市地区的空气质量已显著恶化。', diff: 3, src: 'Cambridge IELTS 9 Test 3' },
    { word: 'contaminate', phonetic: '/kənˈtæmɪneɪt/', pos: 'v.', cn: '污染；玷污', topic: 'environment', eg: 'Pesticides can contaminate groundwater if not properly managed.', eg_cn: '如果管理不当，农药会污染地下水。', diff: 3, src: 'Cambridge IELTS 10 Test 3' },
    { word: 'dispose', phonetic: '/dɪˈspəʊz/', pos: 'v.', cn: '处理；处置', topic: 'environment', eg: 'Properly disposing of hazardous waste is essential for environmental protection.', eg_cn: '妥善处理危险废物对环境保护至关重要。', diff: 2, src: 'Cambridge IELTS 8 Test 2' },
    { word: 'preservation', phonetic: '/ˌprezəˈveɪʃən/', pos: 'n.', cn: '保存；保护', topic: 'environment', eg: 'The preservation of natural habitats is crucial for endangered species.', eg_cn: '自然栖息地的保护对濒危物种至关重要。', diff: 2, src: 'Cambridge IELTS 11 Test 4' },
    { word: 'carbon', phonetic: '/ˈkɑːbən/', pos: 'n.', cn: '碳', topic: 'environment', eg: 'Carbon footprint reduction has become a priority for many companies.', eg_cn: '减少碳足迹已成为许多公司的优先事项。', diff: 1, src: 'Cambridge IELTS 7 Test 1' },
    { word: 'greenhouse', phonetic: '/ˈɡriːnhaʊs/', pos: 'n.', cn: '温室', topic: 'environment', eg: 'The greenhouse effect is essential for maintaining Earth temperature.', eg_cn: '温室效应对维持地球温度至关重要。', diff: 2, src: 'Cambridge IELTS 10 Test 2' },
    { word: 'extinction', phonetic: '/ɪkˈstɪŋkʃən/', pos: 'n.', cn: '灭绝', topic: 'environment', eg: 'Many species face extinction due to habitat loss and climate change.', eg_cn: '许多物种因栖息地丧失和气候变化面临灭绝。', diff: 3, src: 'Cambridge IELTS 12 Test 1' },
    { word: 'habitat', phonetic: '/ˈhæbɪtæt/', pos: 'n.', cn: '栖息地', topic: 'environment', eg: 'Urban development has destroyed much of the natural habitat.', eg_cn: '城市发展已经破坏了许多自然栖息地。', diff: 2, src: 'Cambridge IELTS 9 Test 1' },
    { word: 'ozone', phonetic: '/ˈəʊzəʊn/', pos: 'n.', cn: '臭氧', topic: 'environment', eg: 'The ozone layer protects Earth from harmful ultraviolet radiation.', eg_cn: '臭氧层保护地球免受有害紫外线的伤害。', diff: 2, src: 'Cambridge IELTS 6 Test 4' },
    { word: 'recycle', phonetic: '/ˌriːˈsaɪkəl/', pos: 'v.', cn: '回收；循环利用', topic: 'environment', eg: 'Households are encouraged to recycle paper, glass, and plastic.', eg_cn: '鼓励家庭回收纸张、玻璃和塑料。', diff: 1, src: 'Cambridge IELTS 8 Test 3' },
    { word: 'scarcity', phonetic: '/ˈskeəsəti/', pos: 'n.', cn: '稀缺；不足', topic: 'environment', eg: 'Water scarcity affects billions of people worldwide.', eg_cn: '水资源短缺影响全球数十亿人。', diff: 2, src: 'Cambridge IELTS 11 Test 1' },
    { word: 'adverse', phonetic: '/ˈædvɜːs/', pos: 'adj.', cn: '不利的；有害的', topic: 'environment', eg: 'Climate change has adverse effects on agricultural production.', eg_cn: '气候变化对农业生产有不利影响。', diff: 3, src: 'Cambridge IELTS 10 Test 4' },
    { word: 'deplete', phonetic: '/dɪˈpliːt/', pos: 'v.', cn: '耗尽；用尽', topic: 'environment', eg: 'Overfishing has depleted fish stocks in many oceans.', eg_cn: '过度捕捞已耗尽了许多海洋中的鱼类资源。', diff: 3, src: 'Cambridge IELTS 12 Test 4' },
    { word: 'mitigate', phonetic: '/ˈmɪtɪɡeɪt/', pos: 'v.', cn: '减轻；缓解', topic: 'environment', eg: 'Planting trees helps mitigate the effects of carbon emissions.', eg_cn: '植树有助于减轻碳排放的影响。', diff: 4, src: 'Cambridge IELTS 13 Test 2' },

    // === TECHNOLOGY (32 words) ===
    { word: 'innovation', phonetic: '/ˌɪnəˈveɪʃən/', pos: 'n.', cn: '创新；革新', topic: 'technology', eg: 'Technological innovation has transformed the way we communicate.', eg_cn: '技术创新改变了我们的交流方式。', diff: 2, src: 'Cambridge IELTS 9 Test 2' },
    { word: 'artificial', phonetic: '/ˌɑːtɪˈfɪʃəl/', pos: 'adj.', cn: '人工的；人造的', topic: 'technology', eg: 'Artificial intelligence is being applied in various industries.', eg_cn: '人工智能正在各行各业得到应用。', diff: 2, src: 'Cambridge IELTS 10 Test 3' },
    { word: 'digital', phonetic: '/ˈdɪdʒɪtəl/', pos: 'adj.', cn: '数字的；数码的', topic: 'technology', eg: 'The digital revolution has changed the landscape of modern business.', eg_cn: '数字革命改变了现代商业的格局。', diff: 1, src: 'Cambridge IELTS 8 Test 2' },
    { word: 'automation', phonetic: '/ˌɔːtəˈmeɪʃən/', pos: 'n.', cn: '自动化', topic: 'technology', eg: 'Automation in manufacturing has increased efficiency but reduced jobs.', eg_cn: '制造业的自动化提高了效率但减少了就业岗位。', diff: 3, src: 'Cambridge IELTS 11 Test 4' },
    { word: 'infrastructure', phonetic: '/ˈɪnfrəˌstrʌktʃə/', pos: 'n.', cn: '基础设施', topic: 'technology', eg: 'Investment in digital infrastructure is vital for economic development.', eg_cn: '对数字基础设施的投资对经济发展至关重要。', diff: 3, src: 'Cambridge IELTS 10 Test 1' },
    { word: 'breakthrough', phonetic: '/ˈbreɪkθruː/', pos: 'n.', cn: '突破；重大进展', topic: 'technology', eg: 'The discovery represents a major breakthrough in cancer research.', eg_cn: '这一发现代表了癌症研究的重大突破。', diff: 2, src: 'Cambridge IELTS 9 Test 3' },
    { word: 'cybersecurity', phonetic: '/ˌsaɪbəsɪˈkjʊərəti/', pos: 'n.', cn: '网络安全', topic: 'technology', eg: 'Cybersecurity threats are a growing concern for businesses and governments.', eg_cn: '网络安全威胁是企业和政府日益关注的问题。', diff: 3, src: 'Cambridge IELTS 12 Test 2' },
    { word: 'algorithm', phonetic: '/ˈælɡərɪðəm/', pos: 'n.', cn: '算法', topic: 'technology', eg: 'Search engines use complex algorithms to rank web pages.', eg_cn: '搜索引擎使用复杂的算法对网页进行排名。', diff: 3, src: 'Cambridge IELTS 11 Test 1' },
    { word: 'bandwidth', phonetic: '/ˈbændwɪdθ/', pos: 'n.', cn: '带宽', topic: 'technology', eg: 'Video streaming requires high bandwidth internet connections.', eg_cn: '视频流播放需要高带宽的互联网连接。', diff: 2, src: 'Cambridge IELTS 7 Test 3' },
    { word: 'binary', phonetic: '/ˈbaɪnəri/', pos: 'adj./n.', cn: '二进制的；二元', topic: 'technology', eg: 'Computers process information using binary code.', eg_cn: '计算机使用二进制代码处理信息。', diff: 2, src: 'Cambridge IELTS 8 Test 4' },
    { word: 'module', phonetic: '/ˈmɒdjuːl/', pos: 'n.', cn: '模块；组件', topic: 'technology', eg: 'Each module of the software can be updated independently.', eg_cn: '软件的每个模块都可以独立更新。', diff: 2, src: 'Cambridge IELTS 10 Test 2' },
    { word: 'prototype', phonetic: '/ˈprəʊtətaɪp/', pos: 'n.', cn: '原型；样品', topic: 'technology', eg: 'The engineers built a working prototype of the new device.', eg_cn: '工程师制造了这个新设备的工作原型。', diff: 3, src: 'Cambridge IELTS 12 Test 4' },
    { word: 'sophisticated', phonetic: '/səˈfɪstɪkeɪtɪd/', pos: 'adj.', cn: '复杂的；精密的', topic: 'technology', eg: 'Sophisticated software can detect patterns that humans might miss.', eg_cn: '复杂的软件可以检测到人类可能忽略的模式。', diff: 3, src: 'Cambridge IELTS 9 Test 1' },
    { word: 'synthetic', phonetic: '/sɪnˈθetɪk/', pos: 'adj.', cn: '合成的；人造的', topic: 'technology', eg: 'Synthetic materials have replaced many natural products in industry.', eg_cn: '合成材料已在工业中取代了许多天然产品。', diff: 3, src: 'Cambridge IELTS 11 Test 2' },
    { word: 'telecom', phonetic: '/ˈtelɪkɒm/', pos: 'n.', cn: '电信；通讯', topic: 'technology', eg: 'The telecom industry has undergone massive deregulation.', eg_cn: '电信行业经历了大规模放松管制。', diff: 2, src: 'Cambridge IELTS 8 Test 1' },
    { word: 'virtual', phonetic: '/ˈvɜːtʃuəl/', pos: 'adj.', cn: '虚拟的', topic: 'technology', eg: 'Virtual reality technology is transforming education and entertainment.', eg_cn: '虚拟现实技术正在改变教育和娱乐。', diff: 2, src: 'Cambridge IELTS 10 Test 3' },
    { word: 'obsolete', phonetic: '/ˈɒbsəliːt/', pos: 'adj.', cn: '过时的；废弃的', topic: 'technology', eg: 'Rapid technological advances render many devices obsolete within years.', eg_cn: '快速的技术进步使许多设备在几年内变得过时。', diff: 3, src: 'Cambridge IELTS 12 Test 1' },
    { word: 'database', phonetic: '/ˈdeɪtəbeɪs/', pos: 'n.', cn: '数据库', topic: 'technology', eg: 'The database stores millions of customer records securely.', eg_cn: '该数据库安全地存储了数百万条客户记录。', diff: 1, src: 'Cambridge IELTS 7 Test 2' },
    { word: 'interface', phonetic: '/ˈɪntəfeɪs/', pos: 'n.', cn: '界面；接口', topic: 'technology', eg: 'The user interface should be intuitive and easy to navigate.', eg_cn: '用户界面应该直观且易于导航。', diff: 2, src: 'Cambridge IELTS 9 Test 4' },
    { word: 'network', phonetic: '/ˈnetwɜːk/', pos: 'n./v.', cn: '网络；联网', topic: 'technology', eg: 'Social networks have changed how people form and maintain relationships.', eg_cn: '社交网络改变了人们建立和维持关系的方式。', diff: 1, src: 'Cambridge IELTS 8 Test 3' },
    { word: 'specification', phonetic: '/ˌspesɪfɪˈkeɪʃən/', pos: 'n.', cn: '规格；说明书', topic: 'technology', eg: 'The product must meet strict technical specifications.', eg_cn: '产品必须符合严格的技术规格。', diff: 2, src: 'Cambridge IELTS 11 Test 3' },
    { word: 'transistor', phonetic: '/trænˈzɪstə/', pos: 'n.', cn: '晶体管', topic: 'technology', eg: 'The invention of the transistor revolutionized electronics.', eg_cn: '晶体管的发明彻底改变了电子学。', diff: 3, src: 'Cambridge IELTS 13 Test 1' },
    { word: 'wireless', phonetic: '/ˈwaɪələs/', pos: 'adj.', cn: '无线的', topic: 'technology', eg: 'Wireless technology allows devices to connect without physical cables.', eg_cn: '无线技术允许设备在无需物理线缆的情况下连接。', diff: 1, src: 'Cambridge IELTS 6 Test 2' },
    { word: 'precision', phonetic: '/prɪˈsɪʒən/', pos: 'n.', cn: '精确；精度', topic: 'technology', eg: 'The robot operates with remarkable precision in surgical procedures.', eg_cn: '该机器人在手术过程中以卓越的精确度运行。', diff: 3, src: 'Cambridge IELTS 12 Test 3' },
    { word: 'accelerate', phonetic: '/əkˈseləreɪt/', pos: 'v.', cn: '加速；促进', topic: 'technology', eg: 'New software tools accelerate the development process.', eg_cn: '新的软件工具加速了开发过程。', diff: 2, src: 'Cambridge IELTS 9 Test 2' },
    { word: 'encode', phonetic: '/ɪnˈkəʊd/', pos: 'v.', cn: '编码', topic: 'technology', eg: 'The system encodes sensitive data before transmission.', eg_cn: '系统在传输前对敏感数据进行编码。', diff: 3, src: 'Cambridge IELTS 10 Test 4' },
    { word: 'deploy', phonetic: '/dɪˈplɔɪ/', pos: 'v.', cn: '部署；调动', topic: 'technology', eg: 'The company plans to deploy the new system across all offices.', eg_cn: '公司计划在所有办公室部署新系统。', diff: 2, src: 'Cambridge IELTS 11 Test 4' },
    { word: 'diagnostic', phonetic: '/ˌdaɪəɡˈnɒstɪk/', pos: 'adj./n.', cn: '诊断的；诊断', topic: 'technology', eg: 'Diagnostic tools help identify technical problems quickly.', eg_cn: '诊断工具有助于快速识别技术问题。', diff: 3, src: 'Cambridge IELTS 8 Test 2' },
    { word: 'patent', phonetic: '/ˈpeɪtənt/', pos: 'n./v.', cn: '专利；申请专利', topic: 'technology', eg: 'The company filed a patent for its innovative technology.', eg_cn: '公司为其创新技术申请了专利。', diff: 2, src: 'Cambridge IELTS 7 Test 4' },
    { word: 'cutting-edge', phonetic: '/ˌkʌtɪŋ ˈedʒ/', pos: 'adj.', cn: '前沿的；尖端的', topic: 'technology', eg: 'The laboratory is equipped with cutting-edge research facilities.', eg_cn: '实验室配备了尖端研究设施。', diff: 2, src: 'Cambridge IELTS 12 Test 2' },
    { word: 'versatile', phonetic: '/ˈvɜːsətaɪl/', pos: 'adj.', cn: '多功能的；通用的', topic: 'technology', eg: 'Smartphones are versatile devices used for communication and entertainment.', eg_cn: '智能手机是用于通信和娱乐的多功能设备。', diff: 2, src: 'Cambridge IELTS 9 Test 1' },
    { word: 'integrate', phonetic: '/ˈɪntɪɡreɪt/', pos: 'v.', cn: '整合；集成', topic: 'technology', eg: 'The new system integrates seamlessly with existing software.', eg_cn: '新系统与现有软件无缝集成。', diff: 2, src: 'Cambridge IELTS 10 Test 1' },

    // === SOCIETY (32 words) ===
    { word: 'demographic', phonetic: '/ˌdeməˈɡræfɪk/', pos: 'adj./n.', cn: '人口统计的；人口数据', topic: 'society', eg: 'Demographic changes are reshaping the labor market.', eg_cn: '人口结构的变化正在重塑劳动力市场。', diff: 3, src: 'Cambridge IELTS 9 Test 3' },
    { word: 'urbanization', phonetic: '/ˌɜːbənaɪˈzeɪʃən/', pos: 'n.', cn: '城市化', topic: 'society', eg: 'Rapid urbanization has created housing shortages in major cities.', eg_cn: '快速城市化在主要城市造成了住房短缺。', diff: 3, src: 'Cambridge IELTS 10 Test 2' },
    { word: 'migration', phonetic: '/maɪˈɡreɪʃən/', pos: 'n.', cn: '迁移；移民', topic: 'society', eg: 'International migration patterns have significant economic implications.', eg_cn: '国际移民模式具有重大的经济影响。', diff: 2, src: 'Cambridge IELTS 8 Test 3' },
    { word: 'inequality', phonetic: '/ˌɪnɪˈkwɒləti/', pos: 'n.', cn: '不平等', topic: 'society', eg: 'Income inequality has widened in many developed countries.', eg_cn: '许多发达国家的收入不平等已经扩大。', diff: 3, src: 'Cambridge IELTS 11 Test 2' },
    { word: 'welfare', phonetic: '/ˈwelfeə/', pos: 'n.', cn: '福利；幸福', topic: 'society', eg: 'The welfare system provides support for unemployed citizens.', eg_cn: '福利制度为失业公民提供支持。', diff: 2, src: 'Cambridge IELTS 7 Test 1' },
    { word: 'discrimination', phonetic: '/dɪˌskrɪmɪˈneɪʃən/', pos: 'n.', cn: '歧视', topic: 'society', eg: 'Laws prohibit discrimination based on gender, race, or age.', eg_cn: '法律禁止基于性别、种族或年龄的歧视。', diff: 3, src: 'Cambridge IELTS 10 Test 4' },
    { word: 'integration', phonetic: '/ˌɪntɪˈɡreɪʃən/', pos: 'n.', cn: '融合；一体化', topic: 'society', eg: 'Social integration of immigrants requires community support programs.', eg_cn: '移民的社会融合需要社区支持项目。', diff: 2, src: 'Cambridge IELTS 9 Test 4' },
    { word: 'multicultural', phonetic: '/ˌmʌltiˈkʌltʃərəl/', pos: 'adj.', cn: '多元文化的', topic: 'society', eg: 'Multicultural societies benefit from diverse perspectives and traditions.', eg_cn: '多元文化社会受益于不同的视角和传统。', diff: 2, src: 'Cambridge IELTS 12 Test 3' },
    { word: 'globalization', phonetic: '/ˌɡləʊbəlaɪˈzeɪʃən/', pos: 'n.', cn: '全球化', topic: 'society', eg: 'Globalization has increased economic interdependence between nations.', eg_cn: '全球化增加了国家之间的经济相互依赖。', diff: 2, src: 'Cambridge IELTS 8 Test 1' },
    { word: 'poverty', phonetic: '/ˈpɒvəti/', pos: 'n.', cn: '贫困；贫穷', topic: 'society', eg: 'Poverty alleviation remains a major global challenge.', eg_cn: '扶贫仍然是一个重大的全球挑战。', diff: 1, src: 'Cambridge IELTS 7 Test 4' },
    { word: 'juvenile', phonetic: '/ˈdʒuːvənaɪl/', pos: 'adj./n.', cn: '青少年的；青少年', topic: 'society', eg: 'Juvenile crime rates have decreased in recent years.', eg_cn: '青少年犯罪率近年来有所下降。', diff: 3, src: 'Cambridge IELTS 11 Test 3' },
    { word: 'census', phonetic: '/ˈsensəs/', pos: 'n.', cn: '人口普查', topic: 'society', eg: 'The national census is conducted every ten years.', eg_cn: '全国人口普查每十年进行一次。', diff: 2, src: 'Cambridge IELTS 9 Test 1' },
    { word: 'heritage', phonetic: '/ˈherɪtɪdʒ/', pos: 'n.', cn: '遗产；传统', topic: 'society', eg: 'Cultural heritage sites attract millions of tourists each year.', eg_cn: '文化遗产地每年吸引数百万游客。', diff: 2, src: 'Cambridge IELTS 10 Test 1' },
    { word: 'regulate', phonetic: '/ˈreɡjuleɪt/', pos: 'v.', cn: '监管；调节', topic: 'society', eg: 'Governments regulate industries to protect public health and safety.', eg_cn: '政府监管行业以保护公众健康和安全。', diff: 2, src: 'Cambridge IELTS 8 Test 4' },
    { word: 'legislation', phonetic: '/ˌledʒɪˈsleɪʃən/', pos: 'n.', cn: '立法；法规', topic: 'society', eg: 'New legislation aims to reduce carbon emissions by 50% by 2030.', eg_cn: '新立法旨在到2030年将碳排放减少50%。', diff: 3, src: 'Cambridge IELTS 12 Test 2' },
    { word: 'democracy', phonetic: '/dɪˈmɒkrəsi/', pos: 'n.', cn: '民主；民主制度', topic: 'society', eg: 'Democracy requires active participation from informed citizens.', eg_cn: '民主制度需要知情公民的积极参与。', diff: 2, src: 'Cambridge IELTS 7 Test 2' },
    { word: 'obesity', phonetic: '/əʊˈbiːsəti/', pos: 'n.', cn: '肥胖；过度肥胖', topic: 'society', eg: 'Childhood obesity has become a serious public health concern.', eg_cn: '儿童肥胖已成为一个严重的公共卫生问题。', diff: 2, src: 'Cambridge IELTS 11 Test 1' },
    { word: 'refugee', phonetic: '/ˌrefjuˈdʒiː/', pos: 'n.', cn: '难民', topic: 'society', eg: 'The refugee crisis requires coordinated international response.', eg_cn: '难民危机需要协调的国际应对。', diff: 2, src: 'Cambridge IELTS 10 Test 3' },
    { word: 'suburb', phonetic: '/ˈsʌbɜːb/', pos: 'n.', cn: '郊区', topic: 'society', eg: 'Many families move to the suburbs for better schools and more space.', eg_cn: '许多家庭搬到郊区以获得更好的学校和更多的空间。', diff: 1, src: 'Cambridge IELTS 8 Test 2' },
    { word: 'ethnic', phonetic: '/ˈeθnɪk/', pos: 'adj.', cn: '种族的；民族的', topic: 'society', eg: 'Ethnic diversity enriches the cultural fabric of modern cities.', eg_cn: '民族多样性丰富了现代城市的文化结构。', diff: 2, src: 'Cambridge IELTS 9 Test 2' },
    { word: 'advocate', phonetic: '/ˈædvəkeɪt/', pos: 'v./n.', cn: '倡导；提倡者', topic: 'society', eg: 'Environmental groups advocate for stricter pollution controls.', eg_cn: '环保组织倡导更严格的污染控制。', diff: 3, src: 'Cambridge IELTS 12 Test 4' },
    { word: 'conform', phonetic: '/kənˈfɔːm/', pos: 'v.', cn: '遵守；符合', topic: 'society', eg: 'Social pressure often makes individuals conform to group norms.', eg_cn: '社会压力常常使个人遵守群体规范。', diff: 3, src: 'Cambridge IELTS 11 Test 4' },
    { word: 'dweller', phonetic: '/ˈdwelə/', pos: 'n.', cn: '居民；居住者', topic: 'society', eg: 'City dwellers often face higher living costs than rural residents.', eg_cn: '城市居民通常面临比农村居民更高的生活成本。', diff: 2, src: 'Cambridge IELTS 7 Test 3' },
    { word: 'alienate', phonetic: '/ˈeɪliəneɪt/', pos: 'v.', cn: '疏远；使孤立', topic: 'society', eg: 'Social media can alienate people from real-world interactions.', eg_cn: '社交媒体可能使人们疏远现实世界的互动。', diff: 4, src: 'Cambridge IELTS 13 Test 3' },
    { word: 'autonomy', phonetic: '/ɔːˈtɒnəmi/', pos: 'n.', cn: '自治；自主权', topic: 'society', eg: 'The region was granted greater autonomy from central government.', eg_cn: '该地区被授予了来自中央政府的更大自治权。', diff: 4, src: 'Cambridge IELTS 12 Test 1' },
    { word: 'bureaucracy', phonetic: '/bjʊəˈrɒkrəsi/', pos: 'n.', cn: '官僚制度；繁文缛节', topic: 'society', eg: 'Excessive bureaucracy can hinder economic development.', eg_cn: '过度的官僚制度可能阻碍经济发展。', diff: 3, src: 'Cambridge IELTS 9 Test 3' },
    { word: 'cohesion', phonetic: '/kəʊˈhiːʒən/', pos: 'n.', cn: '凝聚力；团结', topic: 'society', eg: 'Social cohesion is essential for community resilience.', eg_cn: '社会凝聚力对社区韧性至关重要。', diff: 3, src: 'Cambridge IELTS 10 Test 4' },
    { word: 'diverse', phonetic: '/daɪˈvɜːs/', pos: 'adj.', cn: '多样化的；不同的', topic: 'society', eg: 'A diverse workforce brings varied perspectives to problem-solving.', eg_cn: '多元化的劳动力为解决问题带来了不同的视角。', diff: 1, src: 'Cambridge IELTS 8 Test 3' },
    { word: 'empower', phonetic: '/ɪmˈpaʊə/', pos: 'v.', cn: '赋权；使有能力', topic: 'society', eg: 'Education empowers individuals to participate fully in society.', eg_cn: '教育使个人能够充分参与社会。', diff: 2, src: 'Cambridge IELTS 11 Test 2' },
    { word: 'gender', phonetic: '/ˈdʒendə/', pos: 'n.', cn: '性别', topic: 'society', eg: 'Gender equality in the workplace remains an important issue.', eg_cn: '工作场所的性别平等仍然是一个重要问题。', diff: 1, src: 'Cambridge IELTS 7 Test 1' },
    { word: 'phenomenon', phonetic: '/fɪˈnɒmɪnən/', pos: 'n.', cn: '现象', topic: 'society', eg: 'The rise of remote work is a relatively recent phenomenon.', eg_cn: '远程工作的兴起是一个相对近期的现象。', diff: 2, src: 'Cambridge IELTS 9 Test 1' },
    { word: 'socioeconomic', phonetic: '/ˌsəʊʃiəʊˌiːkəˈnɒmɪk/', pos: 'adj.', cn: '社会经济的', topic: 'society', eg: 'Socioeconomic factors significantly influence educational outcomes.', eg_cn: '社会经济因素显著影响教育成果。', diff: 4, src: 'Cambridge IELTS 13 Test 4' },

    // === HEALTH (32 words) ===
    { word: 'diagnosis', phonetic: '/ˌdaɪəɡˈnəʊsɪs/', pos: 'n.', cn: '诊断', topic: 'health', eg: 'Early diagnosis significantly improves treatment outcomes for many diseases.', eg_cn: '早期诊断显著改善许多疾病的治疗效果。', diff: 3, src: 'Cambridge IELTS 10 Test 1' },
    { word: 'epidemic', phonetic: '/ˌepɪˈdemɪk/', pos: 'n./adj.', cn: '流行病；流行的', topic: 'health', eg: 'The obesity epidemic requires urgent public health intervention.', eg_cn: '肥胖流行病需要紧急公共卫生干预。', diff: 3, src: 'Cambridge IELTS 9 Test 2' },
    { word: 'nutrition', phonetic: '/njuːˈtrɪʃən/', pos: 'n.', cn: '营养；营养学', topic: 'health', eg: 'Good nutrition is essential for children physical and mental development.', eg_cn: '良好的营养对儿童的身心发展至关重要。', diff: 2, src: 'Cambridge IELTS 8 Test 3' },
    { word: 'symptom', phonetic: '/ˈsɪmptəm/', pos: 'n.', cn: '症状', topic: 'health', eg: 'Common symptoms of the flu include fever, cough, and fatigue.', eg_cn: '流感的常见症状包括发烧、咳嗽和疲劳。', diff: 2, src: 'Cambridge IELTS 7 Test 4' },
    { word: 'therapy', phonetic: '/ˈθerəpi/', pos: 'n.', cn: '治疗；疗法', topic: 'health', eg: 'Cognitive behavioral therapy is effective for treating anxiety disorders.', eg_cn: '认知行为疗法对治疗焦虑症有效。', diff: 2, src: 'Cambridge IELTS 11 Test 1' },
    { word: 'chronic', phonetic: '/ˈkrɒnɪk/', pos: 'adj.', cn: '慢性的；长期的', topic: 'health', eg: 'Chronic stress can lead to serious health problems over time.', eg_cn: '长期压力会随着时间的推移导致严重的健康问题。', diff: 3, src: 'Cambridge IELTS 9 Test 4' },
    { word: 'immune', phonetic: '/ɪˈmjuːn/', pos: 'adj.', cn: '免疫的', topic: 'health', eg: 'A healthy diet helps strengthen the immune system.', eg_cn: '健康的饮食有助于增强免疫系统。', diff: 2, src: 'Cambridge IELTS 8 Test 1' },
    { word: 'prescription', phonetic: '/prɪˈskrɪpʃən/', pos: 'n.', cn: '处方；药方', topic: 'health', eg: 'This medication is only available with a doctor prescription.', eg_cn: '这种药物只有凭医生处方才能获得。', diff: 2, src: 'Cambridge IELTS 10 Test 4' },
    { word: 'rehabilitation', phonetic: '/ˌriːəˌbɪlɪˈteɪʃən/', pos: 'n.', cn: '康复；恢复', topic: 'health', eg: 'The athlete underwent months of rehabilitation after the injury.', eg_cn: '这名运动员在受伤后进行了数月的康复治疗。', diff: 3, src: 'Cambridge IELTS 12 Test 1' },
    { word: 'sedentary', phonetic: '/ˈsedəntəri/', pos: 'adj.', cn: '久坐的；不活动的', topic: 'health', eg: 'A sedentary lifestyle increases the risk of heart disease.', eg_cn: '久坐不动的生活方式会增加患心脏病的风险。', diff: 4, src: 'Cambridge IELTS 11 Test 3' },
    { word: 'vaccination', phonetic: '/ˌvæksɪˈneɪʃən/', pos: 'n.', cn: '接种疫苗', topic: 'health', eg: 'Childhood vaccination programs have eradicated many infectious diseases.', eg_cn: '儿童疫苗接种计划已根除了许多传染病。', diff: 2, src: 'Cambridge IELTS 7 Test 2' },
    { word: 'hygiene', phonetic: '/ˈhaɪdʒiːn/', pos: 'n.', cn: '卫生；保健', topic: 'health', eg: 'Proper hand hygiene is one of the most effective ways to prevent disease.', eg_cn: '正确的手部卫生是预防疾病最有效的方法之一。', diff: 2, src: 'Cambridge IELTS 6 Test 3' },
    { word: 'insomnia', phonetic: '/ɪnˈsɒmniə/', pos: 'n.', cn: '失眠；失眠症', topic: 'health', eg: 'Chronic insomnia affects approximately 10% of the adult population.', eg_cn: '慢性失眠影响约10%的成年人口。', diff: 3, src: 'Cambridge IELTS 12 Test 3' },
    { word: 'metabolism', phonetic: '/mɪˈtæbəlɪzəm/', pos: 'n.', cn: '新陈代谢', topic: 'health', eg: 'Regular exercise can boost your metabolism and help with weight control.', eg_cn: '定期运动可以促进新陈代谢并有助于控制体重。', diff: 3, src: 'Cambridge IELTS 10 Test 2' },
    { word: 'pathology', phonetic: '/pəˈθɒlədʒi/', pos: 'n.', cn: '病理学；病状', topic: 'health', eg: 'The pathology report confirmed the presence of the disease.', eg_cn: '病理学报告确认了疾病的存在。', diff: 4, src: 'Cambridge IELTS 13 Test 3' },
    { word: 'antibiotic', phonetic: '/ˌæntibaɪˈɒtɪk/', pos: 'n.', cn: '抗生素', topic: 'health', eg: 'Overuse of antibiotics has led to drug-resistant bacteria.', eg_cn: '抗生素的过度使用导致了耐药菌的出现。', diff: 3, src: 'Cambridge IELTS 11 Test 2' },
    { word: 'hereditary', phonetic: '/hɪˈredɪtəri/', pos: 'adj.', cn: '遗传的；世袭的', topic: 'health', eg: 'Some forms of cancer have a hereditary component.', eg_cn: '某些形式的癌症具有遗传因素。', diff: 3, src: 'Cambridge IELTS 9 Test 3' },
    { word: 'dietary', phonetic: '/ˈdaɪətəri/', pos: 'adj.', cn: '饮食的', topic: 'health', eg: 'Dietary habits formed in childhood often persist into adulthood.', eg_cn: '童年形成的饮食习惯通常会持续到成年。', diff: 2, src: 'Cambridge IELTS 7 Test 1' },
    { word: 'cardiovascular', phonetic: '/ˌkɑːdiəʊˈvæskjələ/', pos: 'adj.', cn: '心血管的', topic: 'health', eg: 'Regular exercise reduces the risk of cardiovascular disease.', eg_cn: '定期运动可降低心血管疾病的风险。', diff: 3, src: 'Cambridge IELTS 12 Test 4' },
    { word: 'allergy', phonetic: '/ˈælədʒi/', pos: 'n.', cn: '过敏；过敏症', topic: 'health', eg: 'Food allergies affect approximately 8% of children worldwide.', eg_cn: '食物过敏影响全世界约8%的儿童。', diff: 2, src: 'Cambridge IELTS 10 Test 3' },
    { word: 'contagious', phonetic: '/kənˈteɪdʒəs/', pos: 'adj.', cn: '传染性的', topic: 'health', eg: 'The flu is highly contagious and spreads easily in crowded spaces.', eg_cn: '流感传染性极强，在拥挤空间容易传播。', diff: 3, src: 'Cambridge IELTS 8 Test 2' },
    { word: 'pharmaceutical', phonetic: '/ˌfɑːməˈsuːtɪkəl/', pos: 'adj./n.', cn: '制药的；药品', topic: 'health', eg: 'The pharmaceutical industry invests heavily in research and development.', eg_cn: '制药行业在研发方面投入巨大。', diff: 3, src: 'Cambridge IELTS 11 Test 4' },
    { word: 'resilience', phonetic: '/rɪˈzɪliəns/', pos: 'n.', cn: '恢复力；韧性', topic: 'health', eg: 'Mental resilience helps individuals cope with stress and adversity.', eg_cn: '心理韧性帮助个人应对压力和逆境。', diff: 3, src: 'Cambridge IELTS 12 Test 2' },
    { word: 'supplement', phonetic: '/ˈsʌplɪmənt/', pos: 'n./v.', cn: '补充剂；补充', topic: 'health', eg: 'Vitamin supplements should not replace a balanced diet.', eg_cn: '维生素补充剂不应取代均衡饮食。', diff: 2, src: 'Cambridge IELTS 9 Test 1' },
    { word: 'fatal', phonetic: '/ˈfeɪtəl/', pos: 'adj.', cn: '致命的', topic: 'health', eg: 'Without prompt treatment, the condition can be fatal.', eg_cn: '如果不及时治疗，这种状况可能是致命的。', diff: 2, src: 'Cambridge IELTS 7 Test 3' },
    { word: 'endurance', phonetic: '/ɪnˈdjʊərəns/', pos: 'n.', cn: '耐力；忍耐力', topic: 'health', eg: 'Long-distance running builds both physical and mental endurance.', eg_cn: '长跑可以建立身体和心理上的耐力。', diff: 2, src: 'Cambridge IELTS 10 Test 1' },
    { word: 'deficiency', phonetic: '/dɪˈfɪʃənsi/', pos: 'n.', cn: '缺乏；不足', topic: 'health', eg: 'Iron deficiency is one of the most common nutritional problems worldwide.', eg_cn: '铁缺乏是全球最常见的营养问题之一。', diff: 3, src: 'Cambridge IELTS 11 Test 1' },
    { word: 'wellbeing', phonetic: '/ˌwelˈbiːɪŋ/', pos: 'n.', cn: '健康；幸福', topic: 'health', eg: 'Mental wellbeing is as important as physical health.', eg_cn: '心理健康与身体健康同等重要。', diff: 2, src: 'Cambridge IELTS 8 Test 3' },
    { word: 'disorder', phonetic: '/dɪsˈɔːdə/', pos: 'n.', cn: '紊乱；失调', topic: 'health', eg: 'Anxiety disorders are among the most common mental health conditions.', eg_cn: '焦虑症是最常见的心理健康状况之一。', diff: 2, src: 'Cambridge IELTS 9 Test 2' },
    { word: 'toxic', phonetic: '/ˈtɒksɪk/', pos: 'adj.', cn: '有毒的', topic: 'health', eg: 'Exposure to toxic chemicals can cause serious health problems.', eg_cn: '接触有毒化学物质会导致严重的健康问题。', diff: 2, src: 'Cambridge IELTS 10 Test 4' },
    { word: 'trauma', phonetic: '/ˈtrɔːmə/', pos: 'n.', cn: '创伤；外伤', topic: 'health', eg: 'Psychological trauma can have long-lasting effects on mental health.', eg_cn: '心理创伤可能对心理健康产生持久影响。', diff: 3, src: 'Cambridge IELTS 12 Test 1' },
    { word: 'prevalent', phonetic: '/ˈprevələnt/', pos: 'adj.', cn: '流行的；普遍的', topic: 'health', eg: 'Diabetes is increasingly prevalent in both developed and developing countries.', eg_cn: '糖尿病在发达国家和发展中国家都日益普遍。', diff: 4, src: 'Cambridge IELTS 13 Test 2' },

    // === ECONOMY (32 words) ===
    { word: 'inflation', phonetic: '/ɪnˈfleɪʃən/', pos: 'n.', cn: '通货膨胀', topic: 'economy', eg: 'Central banks aim to keep inflation at a stable level.', eg_cn: '中央银行旨在将通货膨胀保持在稳定水平。', diff: 3, src: 'Cambridge IELTS 9 Test 4' },
    { word: 'recession', phonetic: '/rɪˈseʃən/', pos: 'n.', cn: '经济衰退', topic: 'economy', eg: 'The global recession led to widespread unemployment and business closures.', eg_cn: '全球经济衰退导致了广泛的失业和企业倒闭。', diff: 3, src: 'Cambridge IELTS 10 Test 2' },
    { word: 'subsidy', phonetic: '/ˈsʌbsɪdi/', pos: 'n.', cn: '补贴；津贴', topic: 'economy', eg: 'Government subsidies support farmers during periods of low crop prices.', eg_cn: '政府补贴在作物价格低迷时期支持农民。', diff: 3, src: 'Cambridge IELTS 8 Test 1' },
    { word: 'tariff', phonetic: '/ˈtærɪf/', pos: 'n.', cn: '关税', topic: 'economy', eg: 'Import tariffs protect domestic industries from foreign competition.', eg_cn: '进口关税保护国内产业免受外国竞争。', diff: 3, src: 'Cambridge IELTS 11 Test 3' },
    { word: 'revenue', phonetic: '/ˈrevənjuː/', pos: 'n.', cn: '收入；税收', topic: 'economy', eg: 'The company annual revenue exceeded $10 billion for the first time.', eg_cn: '该公司的年收入首次超过100亿美元。', diff: 2, src: 'Cambridge IELTS 7 Test 2' },
    { word: 'commodity', phonetic: '/kəˈmɒdəti/', pos: 'n.', cn: '商品；货物', topic: 'economy', eg: 'Oil is one of the most traded commodities in the global market.', eg_cn: '石油是全球市场上交易量最大的商品之一。', diff: 3, src: 'Cambridge IELTS 12 Test 2' },
    { word: 'entrepreneur', phonetic: '/ˌɒntrəprəˈnɜː/', pos: 'n.', cn: '企业家', topic: 'economy', eg: 'Successful entrepreneurs identify market opportunities and take calculated risks.', eg_cn: '成功的企业家识别市场机会并承担经过计算的风险。', diff: 2, src: 'Cambridge IELTS 9 Test 1' },
    { word: 'fiscal', phonetic: '/ˈfɪskəl/', pos: 'adj.', cn: '财政的', topic: 'economy', eg: 'Fiscal policy involves government spending and taxation decisions.', eg_cn: '财政政策涉及政府支出和税收决策。', diff: 4, src: 'Cambridge IELTS 11 Test 4' },
    { word: 'monopoly', phonetic: '/məˈnɒpəli/', pos: 'n.', cn: '垄断', topic: 'economy', eg: 'Anti-trust laws prevent companies from establishing monopolies.', eg_cn: '反垄断法防止公司建立垄断。', diff: 3, src: 'Cambridge IELTS 10 Test 3' },
    { word: 'bankruptcy', phonetic: '/ˈbæŋkrʌptsi/', pos: 'n.', cn: '破产', topic: 'economy', eg: 'The company filed for bankruptcy after years of financial losses.', eg_cn: '公司在多年财务亏损后申请破产。', diff: 2, src: 'Cambridge IELTS 8 Test 4' },
    { word: 'dividend', phonetic: '/ˈdɪvɪdend/', pos: 'n.', cn: '股息；红利', topic: 'economy', eg: 'Shareholders receive dividends based on the company profits.', eg_cn: '股东根据公司利润获得股息。', diff: 3, src: 'Cambridge IELTS 12 Test 4' },
    { word: 'depreciation', phonetic: '/dɪˌpriːʃiˈeɪʃən/', pos: 'n.', cn: '贬值；折旧', topic: 'economy', eg: 'Currency depreciation can make exports more competitive internationally.', eg_cn: '货币贬值可以使出口在国际上更具竞争力。', diff: 4, src: 'Cambridge IELTS 11 Test 1' },
    { word: 'prosperity', phonetic: '/prɒˈsperəti/', pos: 'n.', cn: '繁荣；兴旺', topic: 'economy', eg: 'Economic prosperity has lifted millions out of poverty in recent decades.', eg_cn: '近几十年来，经济繁荣使数百万人摆脱了贫困。', diff: 2, src: 'Cambridge IELTS 7 Test 4' },
    { word: 'investment', phonetic: '/ɪnˈvestmənt/', pos: 'n.', cn: '投资', topic: 'economy', eg: 'Foreign direct investment plays a crucial role in economic development.', eg_cn: '外国直接投资在经济发展中起着关键作用。', diff: 1, src: 'Cambridge IELTS 9 Test 2' },
    { word: 'liability', phonetic: '/ˌlaɪəˈbɪləti/', pos: 'n.', cn: '负债；责任', topic: 'economy', eg: 'The company total liabilities exceed its assets.', eg_cn: '该公司的总负债超过其资产。', diff: 3, src: 'Cambridge IELTS 13 Test 3' },
    { word: 'mortgage', phonetic: '/ˈmɔːɡɪdʒ/', pos: 'n.', cn: '抵押贷款；按揭', topic: 'economy', eg: 'Low interest rates have made mortgages more affordable for home buyers.', eg_cn: '低利率使购房者的抵押贷款更加负担得起。', diff: 2, src: 'Cambridge IELTS 8 Test 2' },
    { word: 'surplus', phonetic: '/ˈsɜːpləs/', pos: 'n./adj.', cn: '盈余；过剩', topic: 'economy', eg: 'The government budget surplus was used to reduce national debt.', eg_cn: '政府预算盈余被用于减少国债。', diff: 3, src: 'Cambridge IELTS 10 Test 4' },
    { word: 'deficit', phonetic: '/ˈdefɪsɪt/', pos: 'n.', cn: '赤字；不足', topic: 'economy', eg: 'The trade deficit has widened as imports continue to grow faster than exports.', eg_cn: '随着进口继续快于出口增长，贸易赤字已经扩大。', diff: 3, src: 'Cambridge IELTS 9 Test 3' },
    { word: 'fluctuate', phonetic: '/ˈflʌktʃueɪt/', pos: 'v.', cn: '波动；变动', topic: 'economy', eg: 'Stock prices fluctuate based on market conditions and investor sentiment.', eg_cn: '股票价格根据市场状况和投资者情绪波动。', diff: 3, src: 'Cambridge IELTS 11 Test 2' },
    { word: 'stagnant', phonetic: '/ˈstæɡnənt/', pos: 'adj.', cn: '停滞的；不景气的', topic: 'economy', eg: 'Wages have remained stagnant despite overall economic growth.', eg_cn: '尽管整体经济增长，工资仍然停滞不前。', diff: 3, src: 'Cambridge IELTS 12 Test 3' },
    { word: 'budget', phonetic: '/ˈbʌdʒɪt/', pos: 'n./v.', cn: '预算；编预算', topic: 'economy', eg: 'The government has allocated a significant budget for infrastructure projects.', eg_cn: '政府已为基础设施项目分配了大量预算。', diff: 1, src: 'Cambridge IELTS 7 Test 1' },
    { word: 'transaction', phonetic: '/trænˈzækʃən/', pos: 'n.', cn: '交易；业务', topic: 'economy', eg: 'Online transactions have grown exponentially with the rise of e-commerce.', eg_cn: '随着电子商务的兴起，在线交易呈指数级增长。', diff: 2, src: 'Cambridge IELTS 10 Test 1' },
    { word: 'export', phonetic: '/ˈekspɔːt/', pos: 'n./v.', cn: '出口；输出', topic: 'economy', eg: 'China exports a wide range of manufactured goods to markets worldwide.', eg_cn: '中国向全球市场出口各种制成品。', diff: 1, src: 'Cambridge IELTS 8 Test 3' },
    { word: 'import', phonetic: '/ˈɪmpɔːt/', pos: 'n./v.', cn: '进口；输入', topic: 'economy', eg: 'The country imports most of its oil from the Middle East.', eg_cn: '该国大部分石油从中东进口。', diff: 1, src: 'Cambridge IELTS 8 Test 3' },
    { word: 'privatization', phonetic: '/ˌpraɪvətaɪˈzeɪʃən/', pos: 'n.', cn: '私有化', topic: 'economy', eg: 'The privatization of state-owned enterprises sparked considerable debate.', eg_cn: '国有企业的私有化引发了相当大的争论。', diff: 4, src: 'Cambridge IELTS 12 Test 1' },
    { word: 'sustain', phonetic: '/səˈsteɪn/', pos: 'v.', cn: '维持；支撑', topic: 'economy', eg: 'Can the economy sustain this rate of growth in the long term?', eg_cn: '经济能长期维持这种增长率吗？', diff: 2, src: 'Cambridge IELTS 7 Test 3' },
    { word: 'stimulus', phonetic: '/ˈstɪmjʊləs/', pos: 'n.', cn: '刺激；激励', topic: 'economy', eg: 'The government introduced an economic stimulus package to boost recovery.', eg_cn: '政府推出了一项经济刺激计划以促进复苏。', diff: 3, src: 'Cambridge IELTS 11 Test 2' },
    { word: 'venture', phonetic: '/ˈventʃə/', pos: 'n./v.', cn: '风险项目；冒险', topic: 'economy', eg: 'The joint venture between the two companies created a market leader.', eg_cn: '两家公司的合资企业打造了一个市场领导者。', diff: 2, src: 'Cambridge IELTS 9 Test 4' },
    { word: 'yield', phonetic: '/jiːld/', pos: 'n./v.', cn: '收益；产出', topic: 'economy', eg: 'Government bonds offer a relatively low but stable yield.', eg_cn: '政府债券提供相对较低但稳定的收益。', diff: 3, src: 'Cambridge IELTS 10 Test 2' },
    { word: 'assets', phonetic: '/ˈæsets/', pos: 'n.', cn: '资产', topic: 'economy', eg: 'The company total assets are valued at over $50 billion.', eg_cn: '该公司的总资产价值超过500亿美元。', diff: 2, src: 'Cambridge IELTS 8 Test 1' },
    { word: 'capital', phonetic: '/ˈkæpɪtəl/', pos: 'n.', cn: '资本；资金', topic: 'economy', eg: 'Access to capital is essential for small business growth.', eg_cn: '获取资本对小企业成长至关重要。', diff: 2, src: 'Cambridge IELTS 7 Test 2' },
    { word: 'equilibrium', phonetic: '/ˌiːkwɪˈlɪbriəm/', pos: 'n.', cn: '均衡；平衡', topic: 'economy', eg: 'Market equilibrium occurs when supply equals demand.', eg_cn: '市场均衡发生在供需相等时。', diff: 4, src: 'Cambridge IELTS 13 Test 1' },

    // === CULTURE (32 words) ===
    { word: 'cosmopolitan', phonetic: '/ˌkɒzməˈpɒlɪtən/', pos: 'adj.', cn: '世界性的；国际化的', topic: 'culture', eg: 'London is one of the most cosmopolitan cities in the world.', eg_cn: '伦敦是世界上最国际化的城市之一。', diff: 3, src: 'Cambridge IELTS 13 Test 2' },
    { word: 'civilization', phonetic: '/ˌsɪvəlaɪˈzeɪʃən/', pos: 'n.', cn: '文明', topic: 'culture', eg: 'Ancient civilizations made remarkable advances in mathematics and astronomy.', eg_cn: '古代文明在数学和天文学方面取得了显著进步。', diff: 2, src: 'Cambridge IELTS 9 Test 1' },
    { word: 'ritual', phonetic: '/ˈrɪtʃuəl/', pos: 'n./adj.', cn: '仪式；仪式的', topic: 'culture', eg: 'Traditional rituals play an important role in community bonding.', eg_cn: '传统仪式在社区联系中起着重要作用。', diff: 2, src: 'Cambridge IELTS 7 Test 3' },
    { word: 'festival', phonetic: '/ˈfestɪvəl/', pos: 'n.', cn: '节日；节庆', topic: 'culture', eg: 'The Spring Festival is the most important traditional holiday in China.', eg_cn: '春节是中国最重要的传统节日。', diff: 1, src: 'Cambridge IELTS 6 Test 1' },
    { word: 'archaeology', phonetic: '/ˌɑːkiˈɒlədʒi/', pos: 'n.', cn: '考古学', topic: 'culture', eg: 'Archaeology provides insights into how ancient people lived.', eg_cn: '考古学提供了关于古人如何生活的见解。', diff: 3, src: 'Cambridge IELTS 10 Test 3' },
    { word: 'artifact', phonetic: '/ˈɑːtɪfækt/', pos: 'n.', cn: '手工艺品；文物', topic: 'culture', eg: 'The museum houses artifacts dating back over 5,000 years.', eg_cn: '博物馆收藏了可追溯到5000多年前的文物。', diff: 2, src: 'Cambridge IELTS 11 Test 4' },
    { word: 'indigenous', phonetic: '/ɪnˈdɪdʒɪnəs/', pos: 'adj.', cn: '本土的；土著的', topic: 'culture', eg: 'Indigenous languages are disappearing at an alarming rate.', eg_cn: '土著语言正以惊人的速度消失。', diff: 4, src: 'Cambridge IELTS 12 Test 1' },
    { word: 'dialect', phonetic: '/ˈdaɪəlekt/', pos: 'n.', cn: '方言；土语', topic: 'culture', eg: 'Regional dialects reflect the cultural diversity within a country.', eg_cn: '地方方言反映了一个国家内部的文化多样性。', diff: 2, src: 'Cambridge IELTS 8 Test 4' },
    { word: 'monument', phonetic: '/ˈmɒnjumənt/', pos: 'n.', cn: '纪念碑；历史遗迹', topic: 'culture', eg: 'The monument was built to commemorate those who died in the war.', eg_cn: '这座纪念碑是为了纪念在战争中牺牲的人们而建的。', diff: 1, src: 'Cambridge IELTS 9 Test 2' },
    { word: 'customs', phonetic: '/ˈkʌstəmz/', pos: 'n.', cn: '风俗；习惯', topic: 'culture', eg: 'Learning about local customs is important when visiting foreign countries.', eg_cn: '访问外国时了解当地风俗很重要。', diff: 2, src: 'Cambridge IELTS 7 Test 2' },
    { word: 'aesthetics', phonetic: '/iːsˈθetɪks/', pos: 'n.', cn: '美学；审美', topic: 'culture', eg: 'Japanese aesthetics emphasize simplicity and natural beauty.', eg_cn: '日本美学强调简约和自然之美。', diff: 4, src: 'Cambridge IELTS 13 Test 2' },
    { word: 'gallery', phonetic: '/ˈɡæləri/', pos: 'n.', cn: '画廊；美术馆', topic: 'culture', eg: 'The art gallery features works by both established and emerging artists.', eg_cn: '这家美术馆展出知名艺术家和新锐艺术家的作品。', diff: 1, src: 'Cambridge IELTS 6 Test 4' },
    { word: 'sculpture', phonetic: '/ˈskʌlptʃə/', pos: 'n.', cn: '雕塑；雕刻', topic: 'culture', eg: 'The sculpture in the town square depicts a famous historical event.', eg_cn: '城市广场上的雕塑描绘了一个著名的历史事件。', diff: 2, src: 'Cambridge IELTS 10 Test 1' },
    { word: 'orchestra', phonetic: '/ˈɔːkɪstrə/', pos: 'n.', cn: '管弦乐队', topic: 'culture', eg: 'The orchestra performed Beethoven symphonies to a packed concert hall.', eg_cn: '管弦乐队在座无虚席的音乐厅演奏了贝多芬的交响曲。', diff: 2, src: 'Cambridge IELTS 8 Test 3' },
    { word: 'literary', phonetic: '/ˈlɪtərəri/', pos: 'adj.', cn: '文学的', topic: 'culture', eg: 'Literary works often reflect the social conditions of their time.', eg_cn: '文学作品通常反映它们时代的社会状况。', diff: 3, src: 'Cambridge IELTS 11 Test 1' },
    { word: 'portrait', phonetic: '/ˈpɔːtreɪt/', pos: 'n.', cn: '肖像；描绘', topic: 'culture', eg: 'The portrait captures the subject personality with remarkable detail.', eg_cn: '这幅肖像以非凡的细节捕捉了人物的个性。', diff: 2, src: 'Cambridge IELTS 9 Test 4' },
    { word: 'renaissance', phonetic: '/rɪˈneɪsəns/', pos: 'n.', cn: '文艺复兴；复兴', topic: 'culture', eg: 'The Renaissance period produced extraordinary advances in art and science.', eg_cn: '文艺复兴时期在艺术和科学方面取得了非凡的进步。', diff: 3, src: 'Cambridge IELTS 12 Test 3' },
    { word: 'mythology', phonetic: '/mɪˈθɒlədʒi/', pos: 'n.', cn: '神话；神话学', topic: 'culture', eg: 'Greek mythology continues to influence modern literature and film.', eg_cn: '希腊神话继续影响现代文学和电影。', diff: 2, src: 'Cambridge IELTS 7 Test 4' },
    { word: 'lexicon', phonetic: '/ˈleksɪkən/', pos: 'n.', cn: '词汇；词典', topic: 'culture', eg: 'Every language has a rich lexicon that reflects its cultural heritage.', eg_cn: '每种语言都有丰富的词汇反映其文化遗产。', diff: 4, src: 'Cambridge IELTS 13 Test 3' },
    { word: 'preserve', phonetic: '/prɪˈzɜːv/', pos: 'v.', cn: '保存；保护', topic: 'culture', eg: 'Efforts to preserve traditional crafts are gaining momentum worldwide.', eg_cn: '保护传统手工艺的努力正在全球范围内获得动力。', diff: 2, src: 'Cambridge IELTS 8 Test 1' },
    { word: 'contemporary', phonetic: '/kənˈtempərəri/', pos: 'adj.', cn: '当代的；同时代的', topic: 'culture', eg: 'Contemporary art often challenges traditional notions of beauty.', eg_cn: '当代艺术经常挑战传统的美的概念。', diff: 3, src: 'Cambridge IELTS 11 Test 2' },
    { word: 'tribe', phonetic: '/traɪb/', pos: 'n.', cn: '部落；族群', topic: 'culture', eg: 'The tribe has preserved its unique cultural traditions for centuries.', eg_cn: '这个部落几个世纪以来一直保持着其独特的文化传统。', diff: 2, src: 'Cambridge IELTS 10 Test 2' },
    { word: 'folklore', phonetic: '/ˈfəʊklɔː/', pos: 'n.', cn: '民间传说；民俗', topic: 'culture', eg: 'Folklore stories are passed down from generation to generation orally.', eg_cn: '民间传说故事通过口头代代相传。', diff: 2, src: 'Cambridge IELTS 9 Test 3' },
    { word: 'dynasty', phonetic: '/ˈdɪnəsti/', pos: 'n.', cn: '王朝；朝代', topic: 'culture', eg: 'The Ming Dynasty was a golden age of Chinese porcelain production.', eg_cn: '明朝是中国瓷器生产的黄金时代。', diff: 2, src: 'Cambridge IELTS 7 Test 1' },
    { word: 'exhibit', phonetic: '/ɪɡˈzɪbɪt/', pos: 'n./v.', cn: '展览品；展出', topic: 'culture', eg: 'The museum new exhibit showcases artifacts from ancient Egypt.', eg_cn: '博物馆的新展览展示了古埃及的文物。', diff: 1, src: 'Cambridge IELTS 8 Test 2' },
    { word: 'linguistic', phonetic: '/lɪŋˈɡwɪstɪk/', pos: 'adj.', cn: '语言学的', topic: 'culture', eg: 'Linguistic diversity is declining as minority languages become extinct.', eg_cn: '随着少数民族语言灭绝，语言多样性正在下降。', diff: 4, src: 'Cambridge IELTS 13 Test 4' },
    { word: 'antique', phonetic: '/ænˈtiːk/', pos: 'n./adj.', cn: '古董；古老的', topic: 'culture', eg: 'The antique furniture collection dates back to the 18th century.', eg_cn: '这套古董家具收藏可追溯到18世纪。', diff: 2, src: 'Cambridge IELTS 6 Test 3' },
    { word: 'manuscript', phonetic: '/ˈmænjʊskrɪpt/', pos: 'n.', cn: '手稿；原稿', topic: 'culture', eg: 'Ancient manuscripts provide valuable insights into medieval life.', eg_cn: '古代手稿为了解中世纪生活提供了宝贵的见解。', diff: 3, src: 'Cambridge IELTS 12 Test 4' },
    { word: 'opera', phonetic: '/ˈɒpərə/', pos: 'n.', cn: '歌剧', topic: 'culture', eg: 'Italian opera combines music, drama, and visual spectacle.', eg_cn: '意大利歌剧结合了音乐、戏剧和视觉盛宴。', diff: 2, src: 'Cambridge IELTS 9 Test 1' },
    { word: 'genre', phonetic: '/ˈʒɒnrə/', pos: 'n.', cn: '类型；流派', topic: 'culture', eg: 'The novel blends elements from multiple literary genres.', eg_cn: '这部小说融合了多种文学流派的元素。', diff: 2, src: 'Cambridge IELTS 10 Test 4' },
    { word: 'narrative', phonetic: '/ˈnærətɪv/', pos: 'n./adj.', cn: '叙述；叙事的', topic: 'culture', eg: 'Oral narratives have been a fundamental part of human culture for millennia.', eg_cn: '几千年来，口头叙述一直是人类文化的基本组成部分。', diff: 3, src: 'Cambridge IELTS 11 Test 3' },
    { word: 'anthropology', phonetic: '/ˌænθrəˈpɒlədʒi/', pos: 'n.', cn: '人类学', topic: 'culture', eg: 'Cultural anthropology studies the diversity of human societies and customs.', eg_cn: '文化人类学研究人类社会和习俗的多样性。', diff: 4, src: 'Cambridge IELTS 13 Test 1' },

    // === SCIENCE (32 words) ===
    { word: 'hypothesis', phonetic: '/haɪˈpɒθəsɪs/', pos: 'n.', cn: '假说；假设', topic: 'science', eg: 'The scientist tested her hypothesis through a series of controlled experiments.', eg_cn: '这位科学家通过一系列对照实验检验了她的假说。', diff: 3, src: 'Cambridge IELTS 9 Test 2' },
    { word: 'empirical', phonetic: '/ɪmˈpɪrɪkəl/', pos: 'adj.', cn: '经验主义的；实证的', topic: 'science', eg: 'Empirical evidence supports the theory of climate change.', eg_cn: '经验证据支持气候变化理论。', diff: 4, src: 'Cambridge IELTS 11 Test 3' },
    { word: 'specimen', phonetic: '/ˈspesɪmɪn/', pos: 'n.', cn: '标本；样品', topic: 'science', eg: 'The biologist collected specimens of rare plants for further study.', eg_cn: '生物学家采集了稀有植物标本以供进一步研究。', diff: 3, src: 'Cambridge IELTS 8 Test 4' },
    { word: 'molecule', phonetic: '/ˈmɒlɪkjuːl/', pos: 'n.', cn: '分子', topic: 'science', eg: 'Water molecules consist of two hydrogen atoms and one oxygen atom.', eg_cn: '水分子由两个氢原子和一个氧原子组成。', diff: 2, src: 'Cambridge IELTS 7 Test 2' },
    { word: 'organism', phonetic: '/ˈɔːɡənɪzəm/', pos: 'n.', cn: '生物体；有机体', topic: 'science', eg: 'The simplest organisms can survive in extreme environments.', eg_cn: '最简单的生物体可以在极端环境中生存。', diff: 2, src: 'Cambridge IELTS 10 Test 1' },
    { word: 'genetic', phonetic: '/dʒɪˈnetɪk/', pos: 'adj.', cn: '基因的；遗传的', topic: 'science', eg: 'Genetic research has revolutionized our understanding of diseases.', eg_cn: '基因研究彻底改变了我们对疾病的理解。', diff: 3, src: 'Cambridge IELTS 12 Test 2' },
    { word: 'evolution', phonetic: '/ˌiːvəˈluːʃən/', pos: 'n.', cn: '进化；演变', topic: 'science', eg: 'The theory of evolution explains the diversity of life on Earth.', eg_cn: '进化论解释了地球上生命的多样性。', diff: 2, src: 'Cambridge IELTS 7 Test 3' },
    { word: 'particle', phonetic: '/ˈpɑːtɪkəl/', pos: 'n.', cn: '粒子；微粒', topic: 'science', eg: 'Subatomic particles are the building blocks of all matter.', eg_cn: '亚原子粒子是所有物质的基本构件。', diff: 3, src: 'Cambridge IELTS 11 Test 1' },
    { word: 'synthesis', phonetic: '/ˈsɪnθəsɪs/', pos: 'n.', cn: '合成；综合', topic: 'science', eg: 'The synthesis of new materials has led to technological breakthroughs.', eg_cn: '新材料的合成为技术突破铺平了道路。', diff: 4, src: 'Cambridge IELTS 12 Test 4' },
    { word: 'quantum', phonetic: '/ˈkwɒntəm/', pos: 'n./adj.', cn: '量子；量子的', topic: 'science', eg: 'Quantum computing promises to solve problems beyond classical computers reach.', eg_cn: '量子计算有望解决超出传统计算机能力的问题。', diff: 4, src: 'Cambridge IELTS 13 Test 1' },
    { word: 'catalyst', phonetic: '/ˈkætəlɪst/', pos: 'n.', cn: '催化剂；促进因素', topic: 'science', eg: 'Enzymes act as biological catalysts in chemical reactions.', eg_cn: '酶在化学反应中充当生物催化剂。', diff: 3, src: 'Cambridge IELTS 10 Test 4' },
    { word: 'radiation', phonetic: '/ˌreɪdiˈeɪʃən/', pos: 'n.', cn: '辐射；放射', topic: 'science', eg: 'Prolonged exposure to ultraviolet radiation can cause skin damage.', eg_cn: '长时间暴露在紫外线辐射下可能导致皮肤损伤。', diff: 3, src: 'Cambridge IELTS 8 Test 1' },
    { word: 'mutation', phonetic: '/mjuːˈteɪʃən/', pos: 'n.', cn: '突变；变异', topic: 'science', eg: 'Genetic mutations can be caused by environmental factors.', eg_cn: '基因突变可由环境因素引起。', diff: 3, src: 'Cambridge IELTS 12 Test 3' },
    { word: 'velocity', phonetic: '/vɪˈlɒsəti/', pos: 'n.', cn: '速度；速率', topic: 'science', eg: 'The velocity of light in a vacuum is approximately 300,000 km/s.', eg_cn: '光在真空中的速度约为每秒30万公里。', diff: 3, src: 'Cambridge IELTS 9 Test 1' },
    { word: 'chemistry', phonetic: '/ˈkemɪstri/', pos: 'n.', cn: '化学', topic: 'science', eg: 'Green chemistry aims to reduce the environmental impact of chemical processes.', eg_cn: '绿色化学旨在减少化学过程对环境的影响。', diff: 1, src: 'Cambridge IELTS 7 Test 1' },
    { word: 'biology', phonetic: '/baɪˈɒlədʒi/', pos: 'n.', cn: '生物学', topic: 'science', eg: 'Marine biology explores the diverse life forms inhabiting our oceans.', eg_cn: '海洋生物学探索栖息在我们海洋中的多样生命形式。', diff: 1, src: 'Cambridge IELTS 6 Test 2' },
    { word: 'physics', phonetic: '/ˈfɪzɪks/', pos: 'n.', cn: '物理学', topic: 'science', eg: 'The laws of physics govern everything from subatomic particles to galaxies.', eg_cn: '物理定律支配着从亚原子粒子到星系的一切。', diff: 1, src: 'Cambridge IELTS 8 Test 2' },
    { word: 'experiment', phonetic: '/ɪkˈsperɪmənt/', pos: 'n./v.', cn: '实验；试验', topic: 'science', eg: 'Controlled experiments are essential for establishing causal relationships.', eg_cn: '对照实验对于建立因果关系至关重要。', diff: 1, src: 'Cambridge IELTS 7 Test 4' },
    { word: 'laboratory', phonetic: '/ləˈbɒrətəri/', pos: 'n.', cn: '实验室', topic: 'science', eg: 'The laboratory is equipped with state-of-the-art analytical instruments.', eg_cn: '该实验室配备了最先进的分析仪器。', diff: 1, src: 'Cambridge IELTS 9 Test 3' },
    { word: 'telescope', phonetic: '/ˈtelɪskəʊp/', pos: 'n.', cn: '望远镜', topic: 'science', eg: 'Space telescopes can observe distant galaxies without atmospheric interference.', eg_cn: '太空望远镜可以在没有大气干扰的情况下观测遥远的星系。', diff: 2, src: 'Cambridge IELTS 10 Test 3' },
    { word: 'microscope', phonetic: '/ˈmaɪkrəskəʊp/', pos: 'n.', cn: '显微镜', topic: 'science', eg: 'Electron microscopes can magnify objects up to two million times.', eg_cn: '电子显微镜可以将物体放大到两百万倍。', diff: 2, src: 'Cambridge IELTS 10 Test 3' },
    { word: 'chromosome', phonetic: '/ˈkrəʊməsəʊm/', pos: 'n.', cn: '染色体', topic: 'science', eg: 'Human cells contain 23 pairs of chromosomes.', eg_cn: '人类细胞包含23对染色体。', diff: 3, src: 'Cambridge IELTS 11 Test 2' },
    { word: 'species', phonetic: '/ˈspiːʃiːz/', pos: 'n.', cn: '物种', topic: 'science', eg: 'Scientists estimate there are over 8 million species on Earth.', eg_cn: '科学家估计地球上存在超过800万个物种。', diff: 2, src: 'Cambridge IELTS 8 Test 3' },
    { word: 'phenomena', phonetic: '/fɪˈnɒmɪnə/', pos: 'n.', cn: '现象（复数）', topic: 'science', eg: 'Natural phenomena such as earthquakes are difficult to predict accurately.', eg_cn: '像地震这样的自然现象很难准确预测。', diff: 3, src: 'Cambridge IELTS 10 Test 2' },
    { word: 'variable', phonetic: '/ˈveəriəbəl/', pos: 'n./adj.', cn: '变量；可变的', topic: 'science', eg: 'In this experiment, temperature is the independent variable.', eg_cn: '在这个实验中，温度是自变量。', diff: 2, src: 'Cambridge IELTS 7 Test 3' },
    { word: 'theorem', phonetic: '/ˈθɪərəm/', pos: 'n.', cn: '定理；原理', topic: 'science', eg: 'Pythagorean theorem is fundamental to geometry.', eg_cn: '勾股定理是几何学的基础。', diff: 3, src: 'Cambridge IELTS 12 Test 1' },
    { word: 'formula', phonetic: '/ˈfɔːmjʊlə/', pos: 'n.', cn: '公式；配方', topic: 'science', eg: 'The chemical formula for water is H2O.', eg_cn: '水的化学式是H2O。', diff: 1, src: 'Cambridge IELTS 6 Test 1' },
    { word: 'density', phonetic: '/ˈdensəti/', pos: 'n.', cn: '密度', topic: 'science', eg: 'The density of ice is lower than that of liquid water.', eg_cn: '冰的密度低于液态水的密度。', diff: 2, src: 'Cambridge IELTS 8 Test 4' },
    { word: 'friction', phonetic: '/ˈfrɪkʃən/', pos: 'n.', cn: '摩擦；摩擦力', topic: 'science', eg: 'Friction converts kinetic energy into heat.', eg_cn: '摩擦力将动能转化为热能。', diff: 2, src: 'Cambridge IELTS 9 Test 4' },
    { word: 'volatile', phonetic: '/ˈvɒlətaɪl/', pos: 'adj.', cn: '挥发性的；易变的', topic: 'science', eg: 'The compound is highly volatile and must be stored in sealed containers.', eg_cn: '该化合物极易挥发，必须存放在密封容器中。', diff: 4, src: 'Cambridge IELTS 11 Test 4' },
    { word: 'propagation', phonetic: '/ˌprɒpəˈɡeɪʃən/', pos: 'n.', cn: '传播；繁殖', topic: 'science', eg: 'The propagation of sound waves requires a medium such as air or water.', eg_cn: '声波的传播需要空气或水这样的介质。', diff: 4, src: 'Cambridge IELTS 13 Test 2' },
    { word: 'abstract', phonetic: '/ˈæbstrækt/', pos: 'adj./n.', cn: '抽象的；摘要', topic: 'science', eg: 'Abstract concepts in physics can be difficult for students to visualize.', eg_cn: '物理学中的抽象概念对学生来说可能难以可视化。', diff: 3, src: 'Cambridge IELTS 12 Test 2' },

    // === EXTRA WORDS for random topics (26 words to reach 282 total) ===
    { word: 'profound', phonetic: '/prəˈfaʊnd/', pos: 'adj.', cn: '深刻的；深远的', topic: 'education', eg: 'The research has profound implications for educational policy.', eg_cn: '这项研究对教育政策有深远的影响。', diff: 3, src: 'Cambridge IELTS 10 Test 2' },
    { word: 'scrutiny', phonetic: '/ˈskruːtɪni/', pos: 'n.', cn: '仔细审查', topic: 'education', eg: 'Academic papers undergo rigorous scrutiny before publication.', eg_cn: '学术论文在发表前要经过严格的审查。', diff: 4, src: 'Cambridge IELTS 12 Test 4' },
    { word: 'hazardous', phonetic: '/ˈhæzədəs/', pos: 'adj.', cn: '危险的；有害的', topic: 'environment', eg: 'Hazardous waste must be disposed of according to strict regulations.', eg_cn: '危险废物必须按照严格规定处理。', diff: 3, src: 'Cambridge IELTS 8 Test 2' },
    { word: 'arid', phonetic: '/ˈærɪd/', pos: 'adj.', cn: '干旱的；干燥的', topic: 'environment', eg: 'The arid climate makes agriculture difficult without irrigation.', eg_cn: '干旱的气候使农业在没有灌溉的情况下变得困难。', diff: 3, src: 'Cambridge IELTS 7 Test 4' },
    { word: 'latency', phonetic: '/ˈleɪtənsi/', pos: 'n.', cn: '延迟；潜伏', topic: 'technology', eg: 'Network latency can significantly affect real-time communication quality.', eg_cn: '网络延迟会显著影响实时通信质量。', diff: 3, src: 'Cambridge IELTS 12 Test 1' },
    { word: 'autonomous', phonetic: '/ɔːˈtɒnəməs/', pos: 'adj.', cn: '自主的；自治的', topic: 'technology', eg: 'Autonomous vehicles use sensors and AI to navigate without human input.', eg_cn: '自动驾驶汽车使用传感器和人工智能在无需人工输入的情况下导航。', diff: 4, src: 'Cambridge IELTS 13 Test 4' },
    { word: 'marginalized', phonetic: '/ˈmɑːdʒɪnəlaɪzd/', pos: 'adj.', cn: '被边缘化的', topic: 'society', eg: 'Social policies should address the needs of marginalized communities.', eg_cn: '社会政策应满足被边缘化社区的需求。', diff: 4, src: 'Cambridge IELTS 12 Test 3' },
    { word: 'affluent', phonetic: '/ˈæfluənt/', pos: 'adj.', cn: '富裕的；富足的', topic: 'society', eg: 'Affluent neighborhoods tend to have better-funded schools.', eg_cn: '富裕社区往往有资金更充足的学校。', diff: 2, src: 'Cambridge IELTS 8 Test 1' },
    { word: 'pandemic', phonetic: '/pænˈdemɪk/', pos: 'n./adj.', cn: '大流行病', topic: 'health', eg: 'The COVID-19 pandemic highlighted the importance of public health systems.', eg_cn: 'COVID-19大流行凸显了公共卫生系统的重要性。', diff: 2, src: 'Cambridge IELTS 12 Test 2' },
    { word: 'inflammation', phonetic: '/ˌɪnfləˈmeɪʃən/', pos: 'n.', cn: '炎症；发炎', topic: 'health', eg: 'Chronic inflammation is linked to numerous age-related diseases.', eg_cn: '慢性炎症与许多年龄相关的疾病有关。', diff: 3, src: 'Cambridge IELTS 11 Test 1' },
    { word: 'remittance', phonetic: '/rɪˈmɪtəns/', pos: 'n.', cn: '汇款', topic: 'economy', eg: 'Remittances from overseas workers are a vital source of income for many families.', eg_cn: '来自海外工人的汇款是许多家庭的重要收入来源。', diff: 4, src: 'Cambridge IELTS 12 Test 4' },
    { word: 'audit', phonetic: '/ˈɔːdɪt/', pos: 'n./v.', cn: '审计；查账', topic: 'economy', eg: 'The company undergoes an annual external audit of its financial records.', eg_cn: '该公司每年对其财务记录进行一次外部审计。', diff: 3, src: 'Cambridge IELTS 10 Test 3' },
    { word: 'cuisine', phonetic: '/kwɪˈziːn/', pos: 'n.', cn: '烹饪；菜系', topic: 'culture', eg: 'French cuisine is renowned for its sophistication and rich flavors.', eg_cn: '法国菜以其精致和丰富的风味而闻名。', diff: 2, src: 'Cambridge IELTS 7 Test 1' },
    { word: 'calligraphy', phonetic: '/kəˈlɪɡrəfi/', pos: 'n.', cn: '书法', topic: 'culture', eg: 'Chinese calligraphy is considered both an art form and a meditative practice.', eg_cn: '中国书法被视为一种艺术形式和冥想练习。', diff: 3, src: 'Cambridge IELTS 9 Test 2' },
    { word: 'combustion', phonetic: '/kəmˈbʌstʃən/', pos: 'n.', cn: '燃烧', topic: 'science', eg: 'The internal combustion engine converts fuel into mechanical energy.', eg_cn: '内燃机将燃料转化为机械能。', diff: 3, src: 'Cambridge IELTS 8 Test 1' },
    { word: 'spectrum', phonetic: '/ˈspektrəm/', pos: 'n.', cn: '光谱；范围', topic: 'science', eg: 'The electromagnetic spectrum includes visible light, radio waves, and X-rays.', eg_cn: '电磁波谱包括可见光、无线电波和X射线。', diff: 3, src: 'Cambridge IELTS 11 Test 3' },
    { word: 'controversy', phonetic: '/ˈkɒntrəvɜːsi/', pos: 'n.', cn: '争议；争论', topic: 'society', eg: 'The proposed legislation has generated considerable public controversy.', eg_cn: '拟议的立法已经引起了相当大的公众争议。', diff: 3, src: 'Cambridge IELTS 9 Test 3' },
    { word: 'fiduciary', phonetic: '/fɪˈdjuːʃəri/', pos: 'n./adj.', cn: '受托人；信托的', topic: 'economy', eg: 'Financial advisors have a fiduciary duty to act in their clients best interests.', eg_cn: '财务顾问有受托责任为客户的最大利益行事。', diff: 4, src: 'Cambridge IELTS 13 Test 4' },
    { word: 'physiological', phonetic: '/ˌfɪziəˈlɒdʒɪkəl/', pos: 'adj.', cn: '生理学的', topic: 'health', eg: 'The physiological effects of stress include elevated heart rate and blood pressure.', eg_cn: '压力的生理效应包括心率和血压升高。', diff: 4, src: 'Cambridge IELTS 10 Test 2' },
    { word: 'simulate', phonetic: '/ˈsɪmjuleɪt/', pos: 'v.', cn: '模拟；仿真', topic: 'technology', eg: 'Computer models simulate climate patterns to predict future changes.', eg_cn: '计算机模型模拟气候模式以预测未来变化。', diff: 3, src: 'Cambridge IELTS 9 Test 4' },
    { word: 'feasible', phonetic: '/ˈfiːzəbəl/', pos: 'adj.', cn: '可行的；可能的', topic: 'education', eg: 'The proposed education reform is considered feasible within the current budget.', eg_cn: '拟议的教育改革被认为在当前预算内是可行的。', diff: 3, src: 'Cambridge IELTS 11 Test 2' },
    { word: 'conserve', phonetic: '/kənˈsɜːv/', pos: 'v.', cn: '保存；节约', topic: 'environment', eg: 'Water conservation measures have reduced consumption by 30%.', eg_cn: '节水措施将用水量减少了30%。', diff: 2, src: 'Cambridge IELTS 7 Test 2' },
    { word: 'amplify', phonetic: '/ˈæmplɪfaɪ/', pos: 'v.', cn: '放大；增强', topic: 'technology', eg: 'The device can amplify sound signals without introducing distortion.', eg_cn: '该设备可以在不引入失真的情况下放大声音信号。', diff: 3, src: 'Cambridge IELTS 8 Test 4' },
    { word: 'consensus', phonetic: '/kənˈsensəs/', pos: 'n.', cn: '共识；一致意见', topic: 'society', eg: 'There is broad scientific consensus on the reality of climate change.', eg_cn: '关于气候变化的现实存在广泛的科学共识。', diff: 3, src: 'Cambridge IELTS 9 Test 1' },
    { word: 'predominant', phonetic: '/prɪˈdɒmɪnənt/', pos: 'adj.', cn: '主要的；占主导地位的', topic: 'economy', eg: 'The service sector is the predominant contributor to the country GDP.', eg_cn: '服务业是该国GDP的主要贡献者。', diff: 4, src: 'Cambridge IELTS 12 Test 2' },
    { word: 'elaborate', phonetic: '/ɪˈlæbərət/', pos: 'adj./v.', cn: '精心的；详细阐述', topic: 'culture', eg: 'The palace features elaborate decorations that took artisans decades to complete.', eg_cn: '这座宫殿拥有工匠花费数十年才完成的精美装饰。', diff: 3, src: 'Cambridge IELTS 10 Test 1' },
  ];

  const insertWord = db.prepare(`
    INSERT INTO words (word, phonetic, part_of_speech, chinese_definition, topic, example_sentence, example_translation, difficulty_level, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((items) => {
    for (const w of items) {
      insertWord.run(w.word, w.phonetic, w.pos, w.cn, w.topic, w.eg, w.eg_cn, w.diff, w.src);
    }
  });

  insertMany(words);
  console.log(`Inserted ${words.length} words.`);

  // ======== WRITING QUESTIONS (30+) ========
  const questions = [
    // Task 1 questions (15)
    {
      text: 'The bar chart below shows the percentage of adults who owned smartphones in five different countries between 2010 and 2020. Summarize the information by selecting and reporting the main features, and make comparisons where relevant.',
      taskType: 'task1', chartType: 'bar', questionType: null, difficulty: 2,
      source: 'Cambridge IELTS 15 Test 1',
      model: 'The bar chart illustrates smartphone ownership rates among adults in five countries (the UK, USA, Japan, Brazil, and India) from 2010 to 2020. Overall, smartphone adoption increased significantly across all five countries over the decade, with South Korea consistently maintaining the highest ownership rates. The most dramatic growth was observed in India, where ownership surged from just 10% in 2010 to over 70% by 2020. In contrast, the UK and USA showed more moderate increases, starting at around 40% and reaching approximately 85% by the end of the period.',
      minWords: 150, maxWords: 200
    },
    {
      text: 'The line graph below shows the average monthly temperatures in three major cities (London, Tokyo, and Sydney) over the course of a year. Summarize the information by selecting and reporting the main features, and make comparisons where relevant.',
      taskType: 'task1', chartType: 'line', questionType: null, difficulty: 2,
      source: 'Cambridge IELTS 14 Test 2',
      model: 'The line graph compares the average monthly temperatures in London, Tokyo, and Sydney throughout the year. The most striking feature is that Sydney exhibits an inverse temperature pattern compared to the two Northern Hemisphere cities, with its warmest months occurring from December to February and its coolest period from June to August. Tokyo experiences the greatest temperature variation, ranging from approximately 5°C in January to 28°C in August.',
      minWords: 150, maxWords: 200
    },
    {
      text: 'The pie charts below show the distribution of energy sources used for electricity generation in a European country in 1990 and 2020. Summarize the information by selecting and reporting the main features, and make comparisons where relevant.',
      taskType: 'task1', chartType: 'pie', questionType: null, difficulty: 3,
      source: 'Cambridge IELTS 16 Test 3',
      model: 'The pie charts illustrate how the sources of electricity generation changed in a particular European country between 1990 and 2020. The most significant change was the dramatic increase in renewable energy usage, which rose from just 5% in 1990 to 35% in 2020. Conversely, coal-fired generation fell sharply from 55% to 20% over the same period. Nuclear power remained relatively stable at around 25%.',
      minWords: 150, maxWords: 200
    },
    {
      text: 'The table below gives information about the number of international students enrolled in higher education institutions in four English-speaking countries from 2005 to 2019. Summarize the information by selecting and reporting the main features, and make comparisons where relevant.',
      taskType: 'task1', chartType: 'table', questionType: null, difficulty: 2,
      source: 'Cambridge IELTS 13 Test 1',
      model: 'The table presents data on international student enrollment in higher education across four English-speaking countries (the USA, UK, Australia, and Canada) between 2005 and 2019. Overall, all four countries experienced substantial growth in international student numbers over this period. The USA consistently attracted the largest absolute number of international students, rising from 590,000 in 2005 to over 1 million by 2019. However, Australia showed the fastest relative growth rate, with numbers more than tripling.',
      minWords: 150, maxWords: 200
    },
    {
      text: 'The diagram below shows the process of recycling plastic bottles. Summarize the information by selecting and reporting the main features, and make comparisons where relevant.',
      taskType: 'task1', chartType: 'process', questionType: null, difficulty: 3,
      source: 'Cambridge IELTS 16 Test 2',
      model: 'The diagram illustrates the eight-stage process by which plastic bottles are recycled. The process begins with consumers disposing of used bottles in designated recycling bins. These bottles are then collected and transported to a recycling facility, where they undergo sorting to separate different types of plastic. After sorting, the bottles are thoroughly cleaned to remove any contaminants, then crushed into small flakes. These flakes are melted down and formed into pellets, which serve as raw material for manufacturing new plastic products.',
      minWords: 150, maxWords: 200
    },
    {
      text: 'The maps below show the changes that took place in the town center of Lakeside between 2000 and 2020. Summarize the information by selecting and reporting the main features, and make comparisons where relevant.',
      taskType: 'task1', chartType: 'map', questionType: null, difficulty: 3,
      source: 'Cambridge IELTS 14 Test 4',
      model: 'The two maps compare the layout of Lakeside town center in 2000 and 2020, showing significant redevelopment over the twenty-year period. The most noticeable change was the pedestrianization of the main shopping street, which was previously open to vehicular traffic. A new shopping mall was constructed on the site of a former car park in the northeast of the town center. Additionally, the old factory in the south was demolished and replaced with a residential apartment complex.',
      minWords: 150, maxWords: 200
    },
    {
      text: 'The chart below shows the percentage of household expenditure on different categories in the United Kingdom in 2019. Summarize the information by selecting and reporting the main features, and make comparisons where relevant.',
      taskType: 'task1', chartType: 'bar', questionType: null, difficulty: 1,
      source: 'Cambridge IELTS 12 Test 2',
      model: 'The bar chart breaks down UK household spending across various categories for the year 2019. Housing and utilities accounted for the largest proportion of expenditure at 32%, followed by transport at 14% and food and non-alcoholic drinks at 11%. Recreation and culture represented 10% of household budgets. The smallest categories were education at 2% and communication at 3%.',
      minWords: 150, maxWords: 200
    },
    {
      text: 'The graph below shows the number of tourists visiting a particular Caribbean island from 2010 to 2017. Summarize the information by selecting and reporting the main features, and make comparisons where relevant.',
      taskType: 'task1', chartType: 'line', questionType: null, difficulty: 2,
      source: 'Cambridge IELTS 15 Test 3',
      model: 'The line graph depicts tourist arrivals on a Caribbean island between 2010 and 2017. Overall, the total number of visitors increased substantially from 1 million in 2010 to 3.5 million in 2017. The most significant growth occurred in the number of visitors staying on cruise ships, which rose dramatically from 0.25 million to 2 million. Meanwhile, the number of visitors staying on the island itself showed a more modest increase from 0.75 million to 1.5 million.',
      minWords: 150, maxWords: 200
    },
    {
      text: 'The charts below show the results of a survey about what people of different age groups think makes them most happy. Summarize the information by selecting and reporting the main features, and make comparisons where relevant.',
      taskType: 'task1', chartType: 'pie', questionType: null, difficulty: 2,
      source: 'Cambridge IELTS 11 Test 4',
      model: 'The two pie charts compare the factors that contribute most to happiness according to two age groups: people under 30 and people over 50. For younger people, career achievement was identified as the primary source of happiness at 40%, whereas for older people, health emerged as the most important factor at 35%. Social relationships were equally valued by both groups, accounting for approximately 25% in each category.',
      minWords: 150, maxWords: 200
    },
    {
      text: 'The table below shows the proportion of different categories of families living in poverty in Australia in 2019. Summarize the information by selecting and reporting the main features, and make comparisons where relevant.',
      taskType: 'task1', chartType: 'table', questionType: null, difficulty: 3,
      source: 'Cambridge IELTS 10 Test 2',
      model: 'The table presents data on poverty rates among different family types in Australia for 2019. Overall, single-parent families experienced the highest poverty rate at 21%, which was more than double the rate for couples with children at 9%. Elderly single individuals also faced a relatively high poverty rate of 18%. In contrast, couples without children had the lowest poverty rate at just 5%.',
      minWords: 150, maxWords: 200
    },
    {
      text: 'The diagram below shows how geothermal energy is used to produce electricity. Summarize the information by selecting and reporting the main features.',
      taskType: 'task1', chartType: 'process', questionType: null, difficulty: 3,
      source: 'Cambridge IELTS 12 Test 3',
      model: 'The diagram illustrates the process of generating electricity from geothermal energy. Cold water is first pumped down a 4.5-kilometer injection well into the geothermal zone, where hot rocks heat the water to high temperatures. The heated water then rises through the production well as steam and hot water. At the surface, the steam is separated and used to drive a turbine connected to a generator, which produces electricity. After passing through the turbine, the steam is condensed back into water and pumped back down the injection well.',
      minWords: 150, maxWords: 200
    },
    {
      text: 'The maps below show the development of a seaside village between 1995 and 2015. Summarize the information by selecting and reporting the main features, and make comparisons where relevant.',
      taskType: 'task1', chartType: 'map', questionType: null, difficulty: 2,
      source: 'Cambridge IELTS 9 Test 1',
      model: 'The maps depict the transformation of a seaside village over a twenty-year period from 1995 to 2015. The most striking changes include the construction of a new marina and hotel complex on previously undeveloped coastal land. The village center expanded significantly, with new shops and restaurants replacing former farmland. A new road was built connecting the marina to the main highway, improving accessibility. Some woodland areas were cleared to make way for residential developments.',
      minWords: 150, maxWords: 200
    },
    {
      text: 'The chart below shows the amount of money spent on books in four European countries between 2005 and 2020. Summarize the information by selecting and reporting the main features, and make comparisons where relevant.',
      taskType: 'task1', chartType: 'bar', questionType: null, difficulty: 1,
      source: 'Cambridge IELTS 13 Test 2',
      model: 'The bar chart compares expenditure on books across Germany, France, Italy, and Austria from 2005 to 2020. Overall, Germany consistently spent the most on books throughout the period, with spending peaking at approximately €12 billion in 2015 before declining slightly. France and Italy showed moderate spending levels, while Austria had the lowest expenditure. Notably, all four countries experienced a decline in book spending after 2015, coinciding with the rise of digital reading platforms.',
      minWords: 150, maxWords: 200
    },
    {
      text: 'The graph below shows the population growth rates in rural and urban areas of a developing country from 1980 to 2020. Summarize the information by selecting and reporting the main features, and make comparisons where relevant.',
      taskType: 'task1', chartType: 'line', questionType: null, difficulty: 2,
      source: 'Cambridge IELTS 17 Test 1',
      model: 'The line graph compares population growth rates in rural and urban areas of a developing country over a 40-year period. Urban population growth consistently outpaced rural growth throughout the period. Starting at 3.5% in 1980, urban growth accelerated to a peak of 5% around 2000 before gradually declining to 2.5% by 2020. In contrast, rural growth began at 2% in 1980 and steadily declined, reaching near zero by 2020, indicating a clear trend toward urbanization.',
      minWords: 150, maxWords: 200
    },
    {
      text: 'The pie chart below shows the main reasons why agricultural land in a particular region became less productive over a 20-year period. Summarize the information by selecting and reporting the main features.',
      taskType: 'task1', chartType: 'pie', questionType: null, difficulty: 2,
      source: 'Cambridge IELTS 8 Test 1',
      model: 'The pie chart illustrates the causes of declining agricultural land productivity in a specific region. Overgrazing was the most significant factor, accounting for 35% of land degradation. Deforestation contributed to 30% of the problem, while over-cultivation was responsible for 28%. Other factors, including salinization and urbanization, made up the remaining 7%. This demonstrates that human agricultural practices are the primary drivers of land degradation in this region.',
      minWords: 150, maxWords: 200
    },

    // Task 2 questions (15)
    {
      text: 'Some people believe that university education should be free for everyone, while others argue that students should pay for their own higher education. Discuss both views and give your own opinion.',
      taskType: 'task2', chartType: null, questionType: 'discussion', difficulty: 2,
      source: 'Cambridge IELTS 15 Test 4',
      model: '',
      minWords: 250, maxWords: 350
    },
    {
      text: 'In many countries, the number of elderly people is increasing rapidly. What problems does this trend cause? What solutions can you suggest to address these problems?',
      taskType: 'task2', chartType: null, questionType: 'problem_solution', difficulty: 3,
      source: 'Cambridge IELTS 16 Test 1',
      model: '',
      minWords: 250, maxWords: 350
    },
    {
      text: 'Some people think that governments should invest more in public transportation systems, while others believe that improving road networks for cars is more important. Discuss both views and give your opinion.',
      taskType: 'task2', chartType: null, questionType: 'discussion', difficulty: 2,
      source: 'Cambridge IELTS 14 Test 2',
      model: '',
      minWords: 250, maxWords: 350
    },
    {
      text: 'Technology has changed the way people interact with each other. Do the advantages of this development outweigh the disadvantages?',
      taskType: 'task2', chartType: null, questionType: 'advantages_disadvantages', difficulty: 2,
      source: 'Cambridge IELTS 13 Test 3',
      model: '',
      minWords: 250, maxWords: 350
    },
    {
      text: 'Some people believe that advertising has a negative effect on society and should be controlled more strictly. To what extent do you agree or disagree?',
      taskType: 'task2', chartType: null, questionType: 'opinion', difficulty: 2,
      source: 'Cambridge IELTS 12 Test 4',
      model: '',
      minWords: 250, maxWords: 350
    },
    {
      text: 'In many parts of the world, children are becoming overweight and unhealthy. Some people think that the government should be responsible for solving this problem. To what extent do you agree or disagree?',
      taskType: 'task2', chartType: null, questionType: 'opinion', difficulty: 2,
      source: 'Cambridge IELTS 17 Test 2',
      model: '',
      minWords: 250, maxWords: 350
    },
    {
      text: 'Some countries achieve international success by building specialized sports facilities to train top athletes rather than providing sports facilities that everyone can use. Do you think this is a positive or negative development?',
      taskType: 'task2', chartType: null, questionType: 'opinion', difficulty: 3,
      source: 'Cambridge IELTS 11 Test 1',
      model: '',
      minWords: 250, maxWords: 350
    },
    {
      text: 'Nowadays many people choose to be self-employed rather than to work for a company or organization. Why might this be the case? What could be the disadvantages of being self-employed?',
      taskType: 'task2', chartType: null, questionType: 'two_part', difficulty: 2,
      source: 'Cambridge IELTS 10 Test 3',
      model: '',
      minWords: 250, maxWords: 350
    },
    {
      text: 'Some people think that climate change could have a negative effect on business. Other people think that climate change could create more business opportunities. Discuss both views and give your own opinion.',
      taskType: 'task2', chartType: null, questionType: 'discussion', difficulty: 3,
      source: 'Cambridge IELTS 18 Test 1',
      model: '',
      minWords: 250, maxWords: 350
    },
    {
      text: 'In the future, it may be scientifically possible for people to live for 150 years. Do you think this would be a positive or negative development?',
      taskType: 'task2', chartType: null, questionType: 'opinion', difficulty: 3,
      source: 'Cambridge IELTS 9 Test 4',
      model: '',
      minWords: 250, maxWords: 350
    },
    {
      text: 'International tourism has become a huge industry in the world. Why is this the case? Is this a positive or negative development?',
      taskType: 'task2', chartType: null, questionType: 'two_part', difficulty: 1,
      source: 'Cambridge IELTS 8 Test 2',
      model: '',
      minWords: 250, maxWords: 350
    },
    {
      text: 'In some countries, married couples are deciding to have fewer children or no children at all. What are the reasons for this? What effects does this have on society?',
      taskType: 'task2', chartType: null, questionType: 'two_part', difficulty: 2,
      source: 'Cambridge IELTS 12 Test 1',
      model: '',
      minWords: 250, maxWords: 350
    },
    {
      text: 'Some people think that all teenagers should be required to do unpaid work in their free time to help the local community. They believe this would benefit both the individual teenager and society as a whole. Do you agree or disagree?',
      taskType: 'task2', chartType: null, questionType: 'opinion', difficulty: 2,
      source: 'Cambridge IELTS 10 Test 1',
      model: '',
      minWords: 250, maxWords: 350
    },
    {
      text: 'The number of people who work from home has increased significantly in recent years. What are the advantages and disadvantages of working from home?',
      taskType: 'task2', chartType: null, questionType: 'advantages_disadvantages', difficulty: 1,
      source: 'Cambridge IELTS 15 Test 3',
      model: '',
      minWords: 250, maxWords: 350
    },
    {
      text: 'Some people believe that to be successful in life, you need to get a university education, while others disagree with this view. Discuss both views and give your opinion.',
      taskType: 'task2', chartType: null, questionType: 'discussion', difficulty: 1,
      source: 'Cambridge IELTS 7 Test 3',
      model: '',
      minWords: 250, maxWords: 350
    },
  ];

  const insertQuestion = db.prepare(`
    INSERT INTO writing_questions (question_text, task_type, chart_type, question_type, difficulty, source, model_essay, word_limit_min, word_limit_max)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertQuestions = db.transaction((items) => {
    for (const q of items) {
      insertQuestion.run(q.text, q.taskType, q.chartType, q.questionType, q.difficulty, q.source, q.model, q.minWords, q.maxWords);
    }
  });

  insertQuestions(questions);
  console.log(`Inserted ${questions.length} writing questions.`);

  // Verify counts
  const wordCount = db.prepare('SELECT COUNT(*) as count FROM words').get().count;
  const questionCount = db.prepare('SELECT COUNT(*) as count FROM writing_questions').get().count;
  const topicCounts = db.prepare('SELECT topic, COUNT(*) as count FROM words GROUP BY topic').all();

  console.log(`\n=== Seed Data Summary ===`);
  console.log(`Total words: ${wordCount}`);
  console.log(`Total writing questions: ${questionCount}`);
  console.log(`\nWords by topic:`);
  for (const t of topicCounts) {
    console.log(`  ${t.topic}: ${t.count} words`);
  }

  closeDb();
  console.log(`\nSeed completed successfully!`);
}

seed();
