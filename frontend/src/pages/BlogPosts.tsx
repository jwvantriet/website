import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { ArrowLeft, Calendar, Clock, User, ArrowRight } from "lucide-react";

const AVIATION_IMG =
  "https://mgx-backend-cdn.metadl.com/generate/images/1076476/2026-03-31/29d4afd4-8a38-4bee-81b8-37dd2414c980.png";
const MARITIME_IMG =
  "https://mgx-backend-cdn.metadl.com/generate/images/1076476/2026-03-31/d757b182-0d7d-47a7-8a81-ef65802e4725.png";
const OFFSHORE_IMG =
  "https://mgx-backend-cdn.metadl.com/generate/images/1076476/2026-03-31/0d2b5e42-5118-46bc-996e-66dd5123894b.png";
const HERO_IMG =
  "https://mgx-backend-cdn.metadl.com/generate/images/1076476/2026-03-31/9c31f02f-6316-4192-b06a-035e5243c780.png";

const categories = ["All", "Aviation", "Maritime", "Offshore", "Industry"];

const blogPosts = [
  {
    id: "1",
    title: "The Future of Aviation Workforce Management in 2026",
    excerpt:
      "As the aviation industry continues to recover and grow, workforce management strategies are evolving to meet new demands. Discover the key trends shaping aviation staffing.",
    category: "Aviation",
    author: "Sarah Mitchell",
    date: "March 15, 2026",
    readTime: "5 min read",
    image: AVIATION_IMG,
    content: `The aviation industry is experiencing a transformative period in workforce management. As global air travel continues to grow, airlines and MRO facilities face unprecedented challenges in sourcing qualified, certified professionals.

**Key Trends for 2026:**

1. **Digital Certification Management** — Airlines are increasingly adopting digital platforms to manage and verify crew certifications in real-time, reducing compliance risks and administrative overhead.

2. **Flexible Contracting Models** — The traditional permanent employment model is giving way to more flexible arrangements. Contract professionals now make up a significant portion of the aviation workforce, particularly in maintenance and ground operations.

3. **Cross-Training Initiatives** — Organizations are investing in cross-training programs that allow professionals to work across multiple aircraft types and operational areas, increasing workforce flexibility.

4. **Sustainability Skills** — With the industry's push toward sustainable aviation, new skill requirements are emerging around SAF handling, electric aircraft maintenance, and carbon offset management.

5. **Remote Operations** — Certain aviation roles, particularly in planning, compliance, and quality management, are being adapted for remote or hybrid work arrangements.

At Confair Aviation, we're at the forefront of these changes, continuously adapting our recruitment and deployment strategies to meet the evolving needs of our clients.`,
  },
  {
    id: "2",
    title: "Maritime Safety Standards: What's Changed in 2026",
    excerpt:
      "New IMO regulations and safety standards are reshaping maritime operations. Learn how these changes affect crew requirements and what it means for your operations.",
    category: "Maritime",
    author: "Erik Bakker",
    date: "March 8, 2026",
    readTime: "7 min read",
    image: MARITIME_IMG,
    content: `The International Maritime Organization (IMO) has introduced several significant regulatory changes in 2026 that directly impact crew qualifications and safety standards.

**Major Regulatory Updates:**

The revised STCW amendments now require enhanced cybersecurity training for all bridge officers, reflecting the increasing digitalization of maritime operations. Additionally, new environmental compliance certifications are mandatory for vessels operating in Emission Control Areas.

**Impact on Workforce:**

These changes mean that maritime professionals need to continuously update their skills and certifications. At Confair Maritime, we ensure all our deployed personnel meet the latest regulatory requirements, providing peace of mind to our clients.

**Key Areas of Focus:**

- Enhanced STCW certification requirements
- Cybersecurity awareness training for bridge teams
- Environmental compliance and green shipping skills
- Autonomous vessel operation familiarization
- Mental health and wellbeing standards for seafarers

Our commitment to compliance means we stay ahead of regulatory changes, ensuring our clients always have access to properly certified maritime professionals.`,
  },
  {
    id: "3",
    title: "Offshore Wind Energy: Growing Demand for Skilled Technicians",
    excerpt:
      "The offshore wind sector is booming, creating unprecedented demand for GWO-certified technicians. Here's how the industry is responding to the skills gap.",
    category: "Offshore",
    author: "Lisa Andersen",
    date: "February 28, 2026",
    readTime: "6 min read",
    image: OFFSHORE_IMG,
    content: `The offshore wind energy sector continues its rapid expansion across Europe, Asia, and North America, driving significant demand for skilled technicians and engineers.

**Market Growth:**

Global offshore wind capacity is projected to reach 380 GW by 2032, requiring an estimated 500,000 additional skilled workers. This presents both a challenge and an opportunity for workforce solutions providers.

**Skills in Demand:**

- GWO-certified wind turbine technicians
- Subsea cable installation specialists
- Offshore construction managers
- HSE advisors with renewable energy experience
- Electrical engineers specialized in high-voltage systems

**Confair's Response:**

At Confair Offshore, we've expanded our talent pool to include professionals with both traditional oil & gas experience and renewable energy certifications. Many offshore skills are transferable, and we actively support professionals in transitioning between sectors.

Our GWO-certified technician network has grown by 150% in the past year, positioning us as a leading provider of offshore wind workforce solutions.`,
  },
  {
    id: "4",
    title: "Building Resilient Supply Chains in Safety-Critical Industries",
    excerpt:
      "How workforce planning and flexible contracting models contribute to operational resilience in aviation, maritime, and offshore sectors.",
    category: "Industry",
    author: "Jan de Vries",
    date: "February 15, 2026",
    readTime: "8 min read",
    image: HERO_IMG,
    content: `In today's volatile global environment, operational resilience has become a top priority for organizations in safety-critical industries. A key component of this resilience is workforce planning.

**The Role of Workforce Flexibility:**

Traditional staffing models often leave organizations vulnerable to sudden changes in demand. By incorporating flexible contracting solutions into their workforce strategy, companies can scale their operations up or down without compromising on quality or compliance.

**Best Practices for Workforce Resilience:**

1. Maintain a pre-vetted talent pool for rapid deployment
2. Invest in cross-sector training and certification programs
3. Develop strong partnerships with specialized workforce providers
4. Implement digital workforce management systems
5. Plan for seasonal and project-based demand fluctuations

At Confair, we help our clients build resilient workforce strategies that ensure operational continuity, regardless of market conditions.`,
  },
];

function BlogList() {
  const [activeCategory, setActiveCategory] = useState("All");

  const filtered =
    activeCategory === "All"
      ? blogPosts
      : blogPosts.filter((p) => p.category === activeCategory);

  return (
    <>
      {/* Hero */}
      <section className="bg-[#222c4a] py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <span className="text-[#fbc134] text-sm font-semibold uppercase tracking-wider">
            Insights
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-white mt-3 mb-6">
            Blog & Industry News
          </h1>
          <p className="text-white/70 text-lg max-w-3xl mx-auto leading-relaxed">
            Stay informed with the latest insights, trends, and news from
            aviation, maritime, and offshore energy industries.
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="bg-white border-b border-gray-100 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-2 py-4 overflow-x-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                  activeCategory === cat
                    ? "bg-[#222c4a] text-white"
                    : "bg-gray-100 text-[#5a6275] hover:bg-gray-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Posts Grid */}
      <section className="py-16 md:py-20 bg-[#f2eee7]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-8">
            {filtered.map((post) => (
              <Link
                key={post.id}
                to={`/blog-posts/${post.id}`}
                className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300"
              >
                <div className="h-56 overflow-hidden">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#407df1]/10 text-[#407df1]">
                      {post.category}
                    </span>
                    <span className="text-xs text-[#5a6275] flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {post.readTime}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-[#222c4a] mb-3 group-hover:text-[#407df1] transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-[#5a6275] text-sm leading-relaxed mb-4 line-clamp-3">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[#5a6275] flex items-center gap-1">
                        <User className="w-3 h-3" /> {post.author}
                      </span>
                      <span className="text-xs text-[#5a6275] flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {post.date}
                      </span>
                    </div>
                    <span className="text-[#407df1] text-sm font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                      Read <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function BlogDetail() {
  const { id } = useParams();
  const post = blogPosts.find((p) => p.id === id);

  if (!post) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-2xl font-bold text-[#222c4a] mb-4">
          Post Not Found
        </h2>
        <Link to="/blog-posts" className="text-[#407df1] font-semibold">
          Back to Blog
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <section className="bg-[#222c4a] py-16">
        <div className="max-w-4xl mx-auto px-6">
          <Link
            to="/blog-posts"
            className="inline-flex items-center gap-2 text-white/60 hover:text-[#fbc134] text-sm mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Blog
          </Link>
          <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-[#407df1]/20 text-[#61bef6] mb-4">
            {post.category}
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-6">
            {post.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-white/60 text-sm">
            <span className="flex items-center gap-1.5">
              <User className="w-4 h-4" /> {post.author}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" /> {post.date}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" /> {post.readTime}
            </span>
          </div>
        </div>
      </section>

      {/* Featured Image */}
      <div className="max-w-4xl mx-auto px-6 -mt-0">
        <div className="rounded-2xl overflow-hidden shadow-lg">
          <img
            src={post.image}
            alt={post.title}
            className="w-full h-72 md:h-96 object-cover"
          />
        </div>
      </div>

      {/* Content */}
      <section className="py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="prose prose-lg max-w-none">
            {post.content.split("\n\n").map((paragraph, i) => {
              if (paragraph.startsWith("**") && paragraph.endsWith("**")) {
                return (
                  <h3
                    key={i}
                    className="text-xl font-bold text-[#222c4a] mt-8 mb-4"
                  >
                    {paragraph.replace(/\*\*/g, "")}
                  </h3>
                );
              }
              if (paragraph.includes("**")) {
                const parts = paragraph.split(/(\*\*.*?\*\*)/g);
                return (
                  <p
                    key={i}
                    className="text-[#5a6275] leading-relaxed mb-4"
                  >
                    {parts.map((part, j) =>
                      part.startsWith("**") && part.endsWith("**") ? (
                        <strong key={j} className="text-[#222c4a]">
                          {part.replace(/\*\*/g, "")}
                        </strong>
                      ) : (
                        <span key={j}>{part}</span>
                      )
                    )}
                  </p>
                );
              }
              if (
                paragraph.startsWith("1.") ||
                paragraph.startsWith("- ")
              ) {
                const items = paragraph.split("\n");
                return (
                  <ul key={i} className="space-y-2 mb-6 ml-4">
                    {items.map((item, j) => {
                      const text = item.replace(/^[\d]+\.\s*/, "").replace(/^-\s*/, "");
                      const parts = text.split(/(\*\*.*?\*\*)/g);
                      return (
                        <li
                          key={j}
                          className="text-[#5a6275] leading-relaxed flex items-start gap-2"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-[#fbc134] mt-2.5 shrink-0" />
                          <span>
                            {parts.map((part, k) =>
                              part.startsWith("**") && part.endsWith("**") ? (
                                <strong key={k} className="text-[#222c4a]">
                                  {part.replace(/\*\*/g, "")}
                                </strong>
                              ) : (
                                <span key={k}>{part}</span>
                              )
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                );
              }
              return (
                <p key={i} className="text-[#5a6275] leading-relaxed mb-4">
                  {paragraph}
                </p>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}

export default function BlogPosts() {
  const { id } = useParams();

  return (
    <Layout>{id ? <BlogDetail /> : <BlogList />}</Layout>
  );
}