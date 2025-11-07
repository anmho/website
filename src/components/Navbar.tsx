import { BsAsterisk } from 'react-icons/bs';
function Navbar() {
  return (
    <div className="w-full fixed top-0 left-0 h-24 flex justify-between align-center backdrop-blur bg-black/50 z-50">
      <div className="h-full  flex justify-center align-center flex-col p-10 ">
        <BsAsterisk size={20} />
      </div>

      <div className="h-full flex justify-center align-center flex-row pr-10">
        <div className="h-full flex justify-center align-center flex-col py-10 px-3">
          Blog
        </div>
        <div className="h-full flex justify-center align-center flex-col py-10 px-3">
          Projects
        </div>
        <div className="h-full flex justify-center align-center flex-col py-10 px-3">
          Contact
        </div>
      </div>
    </div>
  );
}

export default Navbar;
