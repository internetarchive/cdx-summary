import setuptools

from cdxsummary import __NAME, __VERSION

with open("README.md", "r") as fh:
    long_description = fh.read()

setuptools.setup(
    name=__NAME,
    version=__VERSION,
    author="Sawood Alam",
    author_email="sawood@archive.org",
    description="Summarize web archive capture index (CDX) files",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/internetarchive/cdx-summary",
    packages=setuptools.find_packages(),
    provides=[
        "cdxsummary"
    ],
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: GNU Affero General Public License v3",
        "Operating System :: OS Independent",
        "Topic :: System :: Archiving",
        "Topic :: Internet :: WWW/HTTP",
        "Topic :: Internet :: WWW/HTTP :: Indexing/Search"
    ],
    python_requires='>=3.6',
    install_requires=[
        "internetarchive",
        "humanize",
        "requests",
        "rich"
    ],
    zip_safe=True,
    entry_points={
        "console_scripts": [
            "cdxsummary = cdxsummary.__main__:main"
        ]
    }
)
