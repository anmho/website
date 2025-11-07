import SectionContainer from './SectionContainer';

interface Skill {
  name: string;
  image: string;
}

// interface SkillCard({skill}) {

// }

interface SkillCardProps {
  skill?: Skill;
}

function SkillCard({ skill }: SkillCardProps) {
  return (
    <div className="bg-white m-2 shadow-md rounded-md transition-all duration-200 hover:scale-110 aspect-square w-28 "></div>
  );
}

function Skills() {
  return (
    <SectionContainer className="h-screen mt-64">
      <div className="flex-col w-full">
        <div className="flex flex-row align-center justify-center w-full p-4 ">
          <div className="inline-flex  flex-wrap p-2  w-fit justify-center flex-[0.9]">
            <SkillCard />
            <SkillCard />
            <SkillCard />
            <SkillCard />
            <SkillCard />
            <SkillCard />
            <SkillCard />
            <SkillCard />
            <SkillCard />
            <SkillCard />
            <SkillCard />
            <SkillCard />
            {/* </div> */}
            {/* <div className="bg-red-500 p-4"> */}
            {/* <div className="flex flex-row align-center bg-green-500 flex-wrap max-w-fit inline-flex"> */}

            {/* </div> */}
          </div>
        </div>
      </div>
    </SectionContainer>
  );
}
export default Skills;
